const config = require('./config');
const chalk = require('chalk');
const fs = require('fs-extra');
const del = require('del');
const path = require('path');
const makeDir = require('make-dir');
const cpx = require('cpx');
const chokidar = require('chokidar');
const imagemin = require('imagemin');
const imageminMozjpeg = require('imagemin-mozjpeg');
const imageminPngquant = require('imagemin-pngquant');
const imageminGifsicle = require('imagemin-gifsicle');
const imageminSvgo = require('imagemin-svgo');
const imageminWebp = require('imagemin-webp');
const imageminAvif = require('imagemin-avif');

class Image {
	constructor(){
		if( config.taskName == 'watch' ) {
			this.watch();
		} else if( config.taskName == 'build' ) {
			this.build();
		}
	}

	watch(){
		const watcher = chokidar.watch(config.image.src, {
			ignored: /[\/\\]\./,
			persistent: true,
			awaitWriteFinish: true
		});
		const ready = ()=>{
			watcher.on('all', async (event, pathname)=>{
				const dest = pathname.replace(config.image.src, config.image.dest);
				// ディレクトリ
				if( event == 'addDir' ) {
					await makeDir(dest);
				} else if( event == 'unlinkDir' ) {
					await del(dest);
				}
				// 画像ファイル
				const { dir, base, ext, name } = path.parse(pathname);
				if( event == 'add' || event == 'change' ) {
					if( name.match(/^\./) ) return;
					await this.compress(pathname);
				} else if( event == 'unlink' ) {
					await del(dest);
					console.log(`${chalk.bold.yellowBright('delete')}: ${chalk(dest)}`);
					if( config.image.webp ) {
						const webp = dest.replace(new RegExp(`${ext}$`), '.webp');
						await del(webp);
						console.log(`${chalk.bold.yellowBright('delete')}: ${chalk(webp)}`);
					}
					if( config.image.avif ) {
						const avif = dest.replace(new RegExp(`${ext}$`), '.avif');
						await del(avif);
						console.log(`${chalk.bold.yellowBright('delete')}: ${chalk(avif)}`);
					}
				}
			});
		};
		watcher.on('ready', ready);
	}

	async build(){
		await del(config.image.dest);
		let items = [];
		const listFiles = (dir)=>{
			fs.readdirSync(dir, {withFileTypes:true})
				.flatMap(async (dirent)=>{
					const name = dirent.name;
					const pathname = `${dir}/${name}`;
					if( dirent.isDirectory() ) {
						listFiles(pathname);
					} else if( dirent.isFile() && !name.match(/^\./) ) {
						items.push(pathname);
					}
				});
		};
		listFiles(config.image.src);
		Promise.all(
			items.map(async (item)=>{
				await this.compress(item);
			})
		).then(async ()=>{
			console.log(chalk.bold.greenBright('All Built!!'));
		});
	}

	compress(item){
		return new Promise(async (resolve)=>{
			let { dir, base, ext, name } = path.parse(item);
			let customOption = {};
			let originalExtCompress = true;
			const dest = dir.replace(config.image.src, config.image.dest);
			for( const match of name.matchAll(/\{(.*?)\}/gui) ) {
				const param = match[1].split('_');
				customOption[param[0]] = param[1];
				name = name.replace(match[0], '');
			}
			if( !fs.existsSync(dest) ) {
				makeDir(dest);
			}
			// jpg, png, gif, svg以外
			if( !/^\.(jpe?g|png|gif|svg)/.test(ext) ) {
				cpx.copy(item, dest);
				console.log(`${chalk.bold.greenBright('copy')}: ${dest}/${base}`);
				resolve();
				return;
			}
			if( /^\.svg/.test(ext) ) {
				const options = ( customOption.compress && customOption.compress == 'none' )? {} : {
					// destination: dest,
					plugins: [
						imageminSvgo({
							plugins: [
								{
									name: 'preset-default',
									params: {
										overrides: {
											removeViewBox: false
										}
									}
								}
							]
						})
					]
				};
				try {
					const file = await imagemin([item], options);
					await fs.writeFile(`${dest}/${name}${ext}`, file[0].data);
					console.log(`${chalk.bold.greenBright('create')}: ${dest}/${name}${ext}`);
				} catch(error) {
					console.log(error);
				}
			}
			// jpg, png, gif
			if( /^\.(jpe?g|png|gif)/.test(ext) ) {
				if(
					( config.image.webp == 'true' || config.image.avif == 'true' )
					&& ( ( /^\.jpe?g/.test(ext) && config.image.jpg == 'false' ) || ( /^\.png/.test(ext) && config.image.png == 'false' ) )
				) {
					originalExtCompress = false;
				}
				if( originalExtCompress ) {
					const jpgQuality = ( customOption.jpg )? parseFloat(customOption.jpg) : 85;
					let pngQuality = [];
					if( customOption.png ) {
						for( const quality of customOption.png.split('-') ) {
							pngQuality.push(parseFloat(quality));
						}
					} else {
						pngQuality = [0.8,1];
					}
					const options = ( customOption.compress && customOption.compress == 'none' )? {} : {
						// destination: dest,
						plugins: [
							imageminMozjpeg({
								quality: jpgQuality
							}),
							imageminPngquant({
								speed: 1,
								quality: pngQuality
							}),
							imageminGifsicle(),
						]
					};
					try {
						const file = await imagemin([item], options);
						await fs.writeFile(`${dest}/${name}${ext}`, file[0].data);
						console.log(`${chalk.bold.greenBright('create')}: ${dest}/${name}${ext}`);
					} catch(error) {
						console.log(error);
					}
				}
				if( config.image.webp == 'true' && /^\.(jpe?g|png)/.test(ext) ) {
					const webpQuality = ( customOption.webp )? parseFloat(customOption.webp) : 85;
					const webpOptions = {
						// destination: dest,
						plugins: [
							imageminWebp({
								quality: webpQuality
							})
						]
					};
					try {
						const webpFile = await imagemin([item], webpOptions);
						await fs.writeFile(`${dest}/${name}.webp`, webpFile[0].data);
						console.log(`${chalk.bold.greenBright('create')}: ${dest}/${name}.webp`);
					} catch(error) {
						console.log(error);
					}
				}
				if( config.image.avif == 'true' && /^\.(jpe?g|png)/.test(ext) ) {
					const avifQuality = ( customOption.avif )? parseFloat(customOption.avif) : 50;
					const avifOptions = {
						// destination: dest,
						plugins: [
							imageminAvif({
								quality: avifQuality
							})
						]
					};
					try {
						const avifFile = await imagemin([item], avifOptions);
						await fs.writeFile(`${dest}/${name}.avif`, avifFile[0].data);
						console.log(`${chalk.bold.greenBright('create')}: ${dest}/${name}.avif`);
					} catch(error) {
						console.log(error);
					}
				}
			}
			resolve();
		});
	}
}

module.exports = new Image();
