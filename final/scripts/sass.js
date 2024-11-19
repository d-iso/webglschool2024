const config = require('./config');
const chalk = require('chalk');
const fs = require('fs-extra');
const del = require('del');
const path = require('path');
const makeDir = require('make-dir');
const chokidar = require('chokidar');
const sass = require('sass');
const postcss = require('postcss');
const autoprefixer = require('autoprefixer');

class Sass {
	constructor(){
		this.files = [];
		this.setFiles();
		if( config.taskName == 'watch' ) {
			this.watch();
		} else if( config.taskName == 'build' ) {
			this.build();
		}
	}

	watch(){
		const watcher = chokidar.watch(config.css.src, {
			ignored: /[\/\\]\./,
			persistent: true
		});
		const ready = ()=>{
			watcher.on('all', async (event, pathname)=>{
				const dest = pathname.replace(config.css.src, config.css.dest)
					.replace(/\.scss$/, '.css');
				const name = path.basename(pathname);
				// ディレクトリ
				if( event == 'addDir' && !name.match(/^_/) ) {
					await makeDir(dest);
				} else if( event == 'unlinkDir' && !name.match(/^_/) ) {
					await del(dest);
				}
				// sassファイル
				const ext = path.extname(name);
				if( ext != '.scss' && ext != '.css' ) return;
				if( event == 'add' ) {
					await this.setFiles();
				}
				if( event == 'add' || event == 'change' ) {
					this.compile();
				}
				if( event == 'unlink' && !name.match(/^_/) ) {
					await del(dest);
					console.log(`${chalk.bold.yellowBright('delete')}: ${chalk(dest)}`);
					this.setFiles();
				}
			});
		};
		watcher.on('ready', ready);
	}

	async build(){
		await del(config.css.dest);
		this.compile();
	}

	compile(){
		Promise.all(
			this.files.map(async (file)=>{
				const dest = file.replace(config.css.src, config.css.dest)
					.replace(/\.scss$/, '.css');
				const sassOptions = {
					file: file,
					outputStyle: ( config.css.minify == 'true' )? 'compressed' : 'expanded',
					charset: true
				};
				if( config.mode == 'development' ) {
					sassOptions.sourceMap = `${dest}.map`;
					sassOptions.sourceMapEmbed = true;
				}
				try {
					const sassResult = await sass.renderSync(sassOptions);
					if( !sassResult ) return;
					const postcssPlugins = [
						autoprefixer({
							grid: true
						})
					];
					const postcssOptions = {
						from: file,
						to: dest
					};
					await postcss(postcssPlugins)
						.process(sassResult.css.toString(), postcssOptions)
						.then(async (result)=>{
							await fs.outputFile(dest, result.css.toString());
							console.log(`${chalk.bold.greenBright('compile')}: ${chalk(dest)}`);
						})
						.catch((error)=>{
							console.log(chalk.red(error));
							// console.log(error);
						});
				} catch(error) {
					console.log(chalk.red(error));
					// console.log(error);
				}
			})
		);
	}

	setFiles(){
		return new Promise((resolve, reject)=>{
			const files = [];
			const listFiles = (dir)=>{
				fs.readdirSync(dir, {withFileTypes:true})
					.flatMap((dirent)=>{
						const name = dirent.name;
						const ext = path.extname(name);
						const pathname = `${dir}/${name}`;
						if( dirent.isDirectory() ) {
							listFiles(pathname);
						} else if( ext == '.scss' && !name.match(/^_/) ) {
							files.push(pathname);
						}
					});
			};
			listFiles(config.css.src);
			this.files = files;
			resolve();
		});
	}
}

module.exports = new Sass();
