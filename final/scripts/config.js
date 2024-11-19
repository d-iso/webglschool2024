const path = require('path');

// プロジェクト名
const name = process.env.npm_package_name;
// ディレクトリ
const project_dir = path.resolve(`${__dirname}/..`);
// 開発ディレクトリ
const src = `${project_dir}/${process.env.npm_package_config_src}`;
// 公開ディレクトリ
const public = `${project_dir}/${process.env.npm_package_config_public}`;
// css
let css = false;
if( process.env.npm_package_config_css_sass ) {
	css = {
		src: `${src}/${process.env.npm_package_config_css_src}`,
		dest: `${public}/${process.env.npm_package_config_css_dest}`,
		minify: process.env.npm_package_config_css_minify
	};
}
// js
let js = false;
if( process.env.npm_package_config_js_webpack ) {
	js = {
		src: `${src}/${process.env.npm_package_config_js_src}`,
		dest: `${public}/${process.env.npm_package_config_js_dest}`,
		entry: {}
	};
	process.env.npm_package_config_js_entry.split(',').forEach((file)=>{
		js.entry[file] = `${js.src}/${file}.js`;
	});
}
// image
let image = false;
if( process.env.npm_package_config_image_compress ) {
	image = {
		src: `${src}/${process.env.npm_package_config_image_src}`,
		dest: `${public}/${process.env.npm_package_config_image_dest}`,
		avif: process.env.npm_package_config_image_avif,
		webp: process.env.npm_package_config_image_webp,
		jpg: process.env.npm_package_config_image_jpg,
		png: process.env.npm_package_config_image_png
	};
}

module.exports = {
	name: name,
	mode: process.env.NODE_ENV || 'production',
	taskName: process.argv[2],
	public: process.env.npm_package_config_public,
	css: css,
	js: js,
	image: image
};