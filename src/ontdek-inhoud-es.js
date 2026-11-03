// Los datos incluidos del mundo del descubrimiento en español (se usa en lugar de ontdek-inhoud.js cuando el profesor elige español).
// { o: tema, v: pregunta, a: opciones, j: posición de la respuesta correcta, w: el dato que va al libro del explorador }.
// Los temas (o) siguen en neerlandés: son claves; la pantalla los traduce.

const PAGE = [
  { o: 'Dieren', v: '¿Qué animal es el más grande del mundo?', a: ['el elefante', 'la ballena azul', 'la jirafa'], j: 1, w: 'La ballena azul puede medir más de 30 metros: más que dos autobuses en fila.' },
  { o: 'Dieren', v: '¿Cuántas patas tiene una araña?', a: ['seis', 'ocho', 'diez'], j: 1, w: 'Una araña tiene ocho patas. Los insectos tienen seis, así que la araña no es un insecto.' },
  { o: 'Ruimte', v: '¿Qué planeta llamamos el planeta rojo?', a: ['Marte', 'Venus', 'Júpiter'], j: 0, w: 'Marte es rojo por el óxido de su suelo: tiene mucho hierro.' },
  { o: 'Ruimte', v: '¿Qué gira alrededor de la Tierra?', a: ['el Sol', 'la Luna', 'Marte'], j: 1, w: 'La Luna da la vuelta a la Tierra en más o menos un mes.' },
  { o: 'Natuur', v: '¿Qué necesita una planta para crecer?', a: ['luz y agua', 'solo arena', 'caramelos'], j: 0, w: 'Con luz del sol, agua y aire, una planta fabrica su propio alimento.' },
  { o: 'Lichaam', v: '¿Cuántos dientes de leche tiene un niño?', a: ['10', '20', '40'], j: 1, w: 'Un niño tiene 20 dientes de leche. Un adulto suele tener después 32.' },
  { o: 'Dieren', v: '¿Qué animal duerme boca abajo?', a: ['el murciélago', 'el búho', 'el gato'], j: 0, w: 'El murciélago se cuelga de las patas cabeza abajo. Así puede echar a volar enseguida.' },
  { o: 'Geschiedenis', v: '¿Dónde vivía a menudo un caballero?', a: ['en un castillo', 'en un iglú', 'en un bloque de pisos'], j: 0, w: 'Un castillo tenía muros gruesos, torres y a veces un foso lleno de agua alrededor.' },
  { o: 'Natuur', v: '¿En qué se convierte una oruga más tarde?', a: ['en una mariposa', 'en un escarabajo', 'en un caracol'], j: 0, w: 'Una oruga hace un capullo y dentro se transforma en mariposa. Eso se llama metamorfosis.' },
  { o: 'Ruimte', v: '¿Qué es el Sol?', a: ['una estrella', 'un planeta', 'una luna'], j: 0, w: 'El Sol es una estrella. Parece más grande que las demás porque está mucho más cerca de nosotros.' },
  { o: 'Dieren', v: '¿Qué animal tiene trompa?', a: ['el elefante', 'el rinoceronte', 'el hipopótamo'], j: 0, w: 'Con la trompa, el elefante puede oler, beber, coger cosas e incluso ducharse.' },
  { o: 'Techniek', v: '¿Qué atrae un imán?', a: ['el hierro', 'la madera', 'el plástico'], j: 0, w: 'Un imán atrae el hierro. No atrae la madera, el plástico ni el papel.' },
  { o: 'Natuur', v: '¿Por qué muchos árboles pierden las hojas en otoño?', a: ['para ahorrar agua y energía para el invierno', 'porque el viento está enfadado', 'porque las hojas están cansadas'], j: 0, w: 'En invierno hay poca luz y el agua se hiela. Sin hojas, el árbol pierde menos agua.' },
  { o: 'Dieren', v: '¿Cómo respira un pez bajo el agua?', a: ['con branquias', 'con pulmones, como nosotros', 'por la cola'], j: 0, w: 'Un pez saca el oxígeno del agua con sus branquias.' },
  { o: 'Uitvindingen', v: '¿Qué se usaba para llamarse antes de que hubiera móviles?', a: ['un teléfono fijo', 'una televisión', 'una radio'], j: 0, w: 'El teléfono se presentó en 1876. Al principio colgaba de la pared, con un cable.' },
];

const SCHILDKNAAP = [
  { o: 'Ruimte', v: '¿Cuál es el planeta más grande de nuestro sistema solar?', a: ['la Tierra', 'Júpiter', 'Saturno', 'Marte'], j: 1, w: 'Júpiter es tan grande que dentro cabrían más de 1300 Tierras.' },
  { o: 'Dieren', v: '¿Qué animal terrestre es el más rápido?', a: ['el guepardo', 'el león', 'el caballo', 'el avestruz'], j: 0, w: 'Un guepardo alcanza unos 100 km por hora, pero solo durante una distancia corta.' },
  { o: 'Uitvindingen', v: '¿Quién dio a conocer en Europa la imprenta de tipos móviles hacia 1450?', a: ['Johannes Gutenberg', 'Thomas Edison', 'Albert Einstein', 'Napoleón'], j: 0, w: 'Gracias a la imprenta, los libros ya no había que copiarlos a mano. Así mucha más gente pudo leer.' },
  { o: 'Geschiedenis', v: '¿Cómo se llamaban los soldados del ejército romano?', a: ['legionarios', 'caballeros', 'samuráis', 'vikingos'], j: 0, w: 'Los legionarios romanos a veces marchaban más de 30 km al día, con todo su equipo a la espalda.' },
  { o: 'Natuur', v: '¿Cuál es el océano más grande?', a: ['el océano Atlántico', 'el océano Pacífico', 'el océano Índico', 'el océano Ártico'], j: 1, w: 'El océano Pacífico es más grande que toda la tierra del planeta junta.' },
  { o: 'Lichaam', v: '¿Qué órgano bombea la sangre por tu cuerpo?', a: ['el corazón', 'los pulmones', 'el estómago', 'el hígado'], j: 0, w: 'Tu corazón late unas 100 000 veces al día, incluso cuando duermes.' },
  { o: 'Ruimte', v: '¿Cuánto tarda la Tierra en dar una vuelta al Sol?', a: ['un día', 'un mes', 'un año', 'diez años'], j: 2, w: 'Una vuelta al Sol dura unos 365 días: un año.' },
  { o: 'Dieren', v: '¿Qué come sobre todo un panda gigante?', a: ['bambú', 'pescado', 'hierba', 'fruta'], j: 0, w: 'Un panda come bambú hasta 12 horas al día, porque tiene poco alimento.' },
  { o: 'Techniek', v: '¿Qué convierte un aerogenerador en electricidad?', a: ['la fuerza del viento', 'la luz del sol', 'el carbón', 'la lluvia'], j: 0, w: 'El viento hace girar las aspas. Un generador dentro del aerogenerador lo convierte en electricidad.' },
  { o: 'Geschiedenis', v: '¿Qué ciudad belga es famosa por su campanario y sus canales?', a: ['Brujas', 'Lieja', 'Hasselt', 'Arlon'], j: 0, w: 'En la Edad Media, Brujas era una de las ciudades comerciales más ricas de Europa.' },
  { o: 'Natuur', v: '¿A qué temperatura se congela el agua?', a: ['0 °C', '10 °C', '100 °C', '-50 °C'], j: 0, w: 'El agua se congela a 0 °C y hierve a 100 °C.' },
  { o: 'Ruimte', v: '¿Quién fue la primera persona en pisar la Luna, en 1969?', a: ['Neil Armstrong', 'Yuri Gagarin', 'Cristóbal Colón', 'Albert Einstein'], j: 0, w: 'Su huella probablemente sigue allí: en la Luna no hay viento.' },
  { o: 'Dieren', v: '¿Qué mamífero puede volar de verdad?', a: ['el murciélago', 'la ardilla voladora', 'el pingüino', 'el avestruz'], j: 0, w: 'El murciélago es el único mamífero que vuela de verdad. La ardilla voladora solo planea.' },
  { o: 'Lichaam', v: '¿Cuántos huesos tiene más o menos un adulto?', a: ['unos 50', 'unos 206', 'unos 1000', 'unos 12'], j: 1, w: 'Un bebé tiene más, unos 300. Algunos se unen después.' },
  { o: 'Ruimte', v: '¿Por qué a veces ves la Luna como media luna?', a: ['solo vemos parte del lado que ilumina el Sol', 'la Luna está rota de verdad', 'hay una nube delante', 'la Tierra le da un mordisco'], j: 0, w: 'La Luna no tiene luz propia. Refleja la luz del Sol.' },
];

const RIDDER = [
  { o: 'Ruimte', v: '¿Cuánto tarda la luz del Sol en llegar a la Tierra?', a: ['unos 8 segundos', 'unos 8 minutos', 'unas 8 horas', 'unos 8 días'], j: 1, w: 'La luz recorre 300 000 km por segundo. Aun así, el viaje del Sol hasta nosotros dura unos 8 minutos.' },
  { o: 'Natuur', v: '¿Qué gas toman las plantas del aire para fabricar alimento?', a: ['oxígeno', 'dióxido de carbono', 'nitrógeno', 'helio'], j: 1, w: 'Las plantas absorben dióxido de carbono y desprenden oxígeno. Eso se llama fotosíntesis.' },
  { o: 'Geschiedenis', v: '¿En qué año se convirtió Bélgica en un país independiente?', a: ['1815', '1830', '1914', '1958'], j: 1, w: 'En 1830 Bélgica se separó del Reino Unido de los Países Bajos. En 1831 llegó el primer rey, Leopoldo I.' },
  { o: 'Uitvindingen', v: '¿Qué descubrió Alexander Fleming en 1928?', a: ['la penicilina', 'la electricidad', 'el teléfono', 'los rayos X'], j: 0, w: 'Fleming vio que un moho mataba bacterias. Así nació el primer antibiótico.' },
  { o: 'Dieren', v: '¿Cuántos corazones tiene un pulpo?', a: ['uno', 'dos', 'tres', 'ocho'], j: 2, w: 'Un pulpo tiene tres corazones y sangre azul.' },
  { o: 'Techniek', v: '¿Por qué hay hilo de cobre en un cable eléctrico?', a: ['el cobre conduce muy bien la electricidad', 'el cobre es bonito y brillante', 'el cobre detiene la electricidad', 'el cobre es magnético'], j: 0, w: 'El cobre conduce bien la electricidad. El plástico de alrededor es un aislante: te protege.' },
  { o: 'Ruimte', v: '¿Qué planeta está más cerca del Sol?', a: ['Mercurio', 'Venus', 'la Tierra', 'Marte'], j: 0, w: 'En Mercurio hace más de 400 °C de día y menos de -170 °C de noche.' },
  { o: 'Geschiedenis', v: '¿Qué pintor hizo el Retablo de Gante junto con su hermano?', a: ['Jan van Eyck', 'Pedro Pablo Rubens', 'René Magritte', 'Pieter Bruegel'], j: 0, w: 'El Retablo de Gante se terminó en 1432 y es uno de los cuadros más famosos del mundo.' },
  { o: 'Natuur', v: '¿Qué mide un barómetro?', a: ['la presión del aire', 'la temperatura', 'la velocidad del viento', 'cuánta lluvia cae'], j: 0, w: 'Cuando la presión del aire baja deprisa, a menudo se acerca mal tiempo.' },
  { o: 'Lichaam', v: '¿Qué transportan tus glóbulos rojos?', a: ['oxígeno', 'comida al estómago', 'sonido', 'calcio para los huesos'], j: 0, w: 'Los glóbulos rojos llevan oxígeno de los pulmones a todo el cuerpo.' },
  { o: 'Uitvindingen', v: '¿Quién hizo útil la bombilla para las casas hacia 1879?', a: ['Thomas Edison', 'Isaac Newton', 'Leonardo da Vinci', 'Marie Curie'], j: 0, w: 'Otros también trabajaron en la bombilla, pero Edison hizo una que duraba mucho tiempo encendida.' },
  { o: 'Dieren', v: '¿Por qué un oso polar tiene la piel negra bajo su pelo blanco?', a: ['la piel negra absorbe bien el calor del sol', 'para esconderse de noche', 'porque está sucio', 'para atraer peces'], j: 0, w: 'Los pelos del oso polar en realidad son transparentes. Parecen blancos por la luz.' },
  { o: 'Ruimte', v: '¿Qué es un año luz?', a: ['una distancia', 'un tiempo', 'una velocidad', 'una estrella'], j: 0, w: 'Un año luz es la distancia que recorre la luz en un año: casi 10 billones de kilómetros.' },
  { o: 'Techniek', v: '¿Por qué flota un pesado barco de acero?', a: ['desplaza mucha agua y por dentro está casi hueco', 'el acero siempre flota', 'los motores lo sostienen', 'el agua del mar es pegajosa'], j: 0, w: 'Un objeto flota cuando desplaza más agua de lo que pesa. Lo descubrió Arquímedes.' },
  { o: 'Geschiedenis', v: '¿Qué invento de hacia el 3500 a. C. facilitó mucho el transporte?', a: ['la rueda', 'la máquina de vapor', 'la bicicleta', 'el tren'], j: 0, w: 'Las primeras ruedas eran de una sola pieza de madera. Más tarde se añadieron radios para que pesaran menos.' },
];

// Lo que descubres en el laboratorio, por experimento. Tras cada experimento resuelto, un dato va a tu libro del explorador.
const LABO = {
  stroom: [
    'La corriente solo circula cuando el circuito está completamente cerrado. Un solo corte y la lámpara se apaga.',
    'Los metales como el cobre conducen bien la electricidad. El plástico, la madera y la goma no: son aislantes.',
    'Un interruptor abre o cierra el circuito. Así enciendes y apagas una lámpara.',
    'Hacia 1800, Alessandro Volta fabricó la primera pila, con discos de metal y cartón en agua salada.',
  ],
  tandwiel: [
    'Dos engranajes que encajan giran siempre en sentidos contrarios.',
    'Un engranaje pequeño gira más rápido que uno grande. Si el grande tiene el triple de dientes, el pequeño da el triple de vueltas.',
    'En una bici los engranajes funcionan con una cadena: un plato grande delante y un piñón pequeño detrás te hacen ir rápido.',
    'Los relojes antiguos de las torres están llenos de engranajes. Así la aguja de las horas gira doce veces más despacio que la de los minutos.',
  ],
  wip: [
    'Con una palanca levantas algo pesado usando menos fuerza.',
    'Cuanto más lejos está algo del punto de apoyo, más fuerza hace. Por eso un niño puede levantar a un adulto en el balancín.',
    'Arquímedes dijo: «Dadme un punto de apoyo y moveré el mundo». Hablaba de una palanca muy larga.',
    'Las tijeras, un cascanueces y una carretilla también son palancas.',
  ],
  drijven: [
    'Algo flota cuando pesa menos que la misma cantidad de agua. El corcho y la madera son más ligeros que el agua, el hierro y la piedra más pesados.',
    'Una bola de plastilina se hunde, pero si haces con ella un barquito, flota: desplaza más agua.',
    'En agua salada se flota más fácil que en agua dulce. En el mar Muerto casi puedes sentarte sobre el agua.',
    'Una naranja con piel flota gracias a las burbujas de aire de la piel. Sin piel, se hunde.',
  ],
  thermo: [
    'El agua se congela a 0 grados y hierve a 100 grados. La escala Celsius se basa en eso.',
    'Bajo cero se escribe un menos: -5 grados son 5 grados más frío que 0.',
    'La diferencia entre -3 y 4 grados es de 7 grados: 3 hasta cero y luego 4 más.',
    'Tu cuerpo está a unos 37 grados. Con 38 grados o más tienes fiebre.',
  ],
};

module.exports = { PAGE, SCHILDKNAAP, RIDDER, LABO };
