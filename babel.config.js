module.exports = function(api) {
    api.cache(true);

    return {
        "presets": [
            ["@babel/preset-env", {
                "useBuiltIns": "usage",
                "corejs": "3.1.3"
            }]
        ],
        "plugins": [
            "@babel/plugin-syntax-dynamic-import"
        ]
    };
};
