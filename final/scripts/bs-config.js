const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = {
	files: ['./public_html/**/*'],
	open: 'external',
	ghostMode: false,
	server: {
		baseDir: './public_html/',
		// middleware: [
		// 	createProxyMiddleware({
		// 		target: 'http://www.re-d.jp/',
		// 		changeOrigin: true,
		// 		pathFilter: '/uploads'
		// 	})
		// ]
	}
}