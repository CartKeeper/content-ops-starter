const path = require('path');

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
    env: {
        stackbitPreview: process.env.STACKBIT_PREVIEW
    },
    trailingSlash: true,
    reactStrictMode: true,
    allowedDevOrigins: [
        '192.168.1.84'
    ],
    webpack: (config) => {
        config.resolve = config.resolve || {};
        config.resolve.alias = {
            ...(config.resolve.alias || {}),
            'netlify-identity-widget': path.resolve(__dirname, 'src/stubs/netlify-identity-widget.ts')
        };
        return config;
    }
};

module.exports = nextConfig;
