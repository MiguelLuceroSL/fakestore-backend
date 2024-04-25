/*SERVER OFICIAL*/
const express = require('express');
const fetch = require('node-fetch');
const { readFileSync, writeFileSync } = require('fs');
const { traducir } = require('./traslate.js');
const { primeraLetra } = require('./first.js');
const path = require('path');

const app = express();
const PORT = 3000;

//leer el json descuentos
var descuentosRaw = readFileSync('./descuentos.json');
var descuentos = JSON.parse(descuentosRaw);


app.use(express.json());
function generarID() {
    return Math.random().toString(36).substr(2, 9);
}

//middleware para servir archivos estáticos desde la carpeta 'build'
app.use(express.static(path.join(__dirname, 'build')));

app.post('/comprar', (req, res) => {
    const nuevosProductos = req.body; //obtengo los nuevos productos
    try {
        //leo los productos que ya fueron comprados y ya estan en el json
        const productosExistentesRaw = readFileSync('productos_comprados.json');
        const productosExistentes = JSON.parse(productosExistentesRaw);

        //combino las compras de antes con la nueva
        const productosActualizados = [...productosExistentes, { idCompra: generarID(), ...nuevosProductos }];

        //guardar los productos actualizados en el json
        writeFileSync('productos_comprados.json', JSON.stringify(productosActualizados));

        res.json({ message: 'La compra se ha realizado exitosamente.' });
    } catch (error) {
        console.error('Error al guardar productos:', error);
        res.status(500).json({ error: 'Error al guardar productos.' });
    }
});

//ruta para obtener un producto por su ID
app.get('/productos/:id', async (req, res) => {
    const id = req.params.id; //obtener la ID del parametro de la url
    try {
        const response = await fetch(`https://fakestoreapi.com/products/${id}`); //consumir la api con la ID
        const producto = await response.json(); //convertir a json
        //traduzco
        let titulo = await traducir(producto.title);
        let descripcion = await traducir(producto.description);
        let categoria = await traducir(producto.category);
        //le pongo la primer letra en mayuscula para mostrarla asi
        titulo = primeraLetra(titulo);
        descripcion = primeraLetra(descripcion);
        categoria = primeraLetra(categoria);
        //asigno los nuevos valores
        producto.title = titulo;
        producto.description = descripcion;
        producto.category = categoria;
        //veo si la id del producto coincide con la id de descuento
        const descuento = descuentos.find(descuento => descuento.id === producto.id);
        if (descuento) {
            // siesque hay descuento
            producto.descuento = descuento.descuento;
            let descuentoValor = producto.price * (producto.descuento / 100);
            let descuentoValorDecimal = parseFloat(descuentoValor).toFixed(2);
            producto.descuentoEnDinero = Number(descuentoValorDecimal);

            let precioFinal = producto.price - producto.descuentoEnDinero;
            let precioFinalDecimal = parseFloat(precioFinal).toFixed(2);
            producto.precioConDescuentoAplicado = Number(precioFinalDecimal);

            producto.tieneDescuento = true;
        } else {
            producto.precioConDescuentoAplicado = producto.price;
            //le pongo el atributo ese para que tenga el precio, asi
            //en el front solo muestro el atributo ese siempre
            producto.tieneDescuento = false; //si no hay descuento igual
            //le da el atributo pero en false para manejar en el front
        }
        res.json(producto);
    } catch (error) {
        console.error(`Error al obtener producto con ID ${id}:`, error);
        res.status(500).json({ error: `Error al obtener producto con ID ${id}` });
    }
});

app.get('/productos', async (req, res) => {
    const { category } = req.query; //obtengo la categoria
    let url = 'https://fakestoreapi.com/products'; //url para fetch
    try {
        if (category) {
            url += `/category/${category}`; //concateno la url+categoria siesque hay
        }
        const response = await fetch(url); //hago el fetch
        let productos = await response.json(); //convierto a json

        //mapeo los productos y los traduzco y aplico descuento y los envio
        productos = await Promise.all(productos.map(async (producto) => {
            //traduzco los atributos
            let titulo = await traducir(producto.title);
            let descripcion = await traducir(producto.description);
            let categoria = await traducir(producto.category);
            //le pongo la primer letra mayuscula para mostrarla asi
            titulo = primeraLetra(titulo);
            descripcion = primeraLetra(descripcion);
            categoria = primeraLetra(categoria);
            //asigno los valores cambiados
            producto.title = titulo;
            producto.description = descripcion;
            producto.category = categoria;

            //veo si la id del producto coincide con la id de descuento
            const descuento = descuentos.find(descuento => descuento.id === producto.id);
            if (descuento) {
                //siesque hay descuento
                producto.descuento = descuento.descuento;
                let descuentoValor = producto.price * (producto.descuento / 100);
                let descuentoValorDecimal = parseFloat(descuentoValor).toFixed(2);
                producto.descuentoEnDinero = Number(descuentoValorDecimal);

                let precioFinal = producto.price - producto.descuentoEnDinero;
                let precioFinalDecimal = parseFloat(precioFinal).toFixed(2);
                producto.precioConDescuentoAplicado = Number(precioFinalDecimal);

                producto.tieneDescuento = true;
            } else {
                producto.tieneDescuento = false;
                //si no hay descuento igual le da el atributo pero en false
                //para manejar en el front
            }
            console.log(producto)
            return producto; //retorno el producto ya modificado del mapeo
        }));

        res.json(productos); //envio todos los productos cambiados al front
    } catch (error) {
        console.error('Error al obtener productos:', error);
        res.status(500).json({ error: 'Error al obtener productos' });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});