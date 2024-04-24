const translate = require('node-google-translate-skidz');

async function traducir(texto) {
    const result = await translate({
        text: texto,
        source: 'en',
        target: 'es'
    });
    return result.translation;
}

module.exports = { traducir };