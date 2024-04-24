function primeraLetra(texto) {
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

module.exports = { primeraLetra };