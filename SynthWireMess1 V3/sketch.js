
//Variables de arduino
let serial;
let datosquevienen = false;
let Puerto = "COM6";
//Variables del sonido
let osc1, osc2, osc3, modulator1,oscNoise;
let osc1Freq, osc2Freq,osc3Freq, osc1Amp,osc2Amp,osc3Amp;
let fft, reverb;
//Variables de visuales (particulas,color,etc)
let particles = [];
let R,G,B,radio,velocity,maxDist;
//declara la clase de particula con capacidad de crearse, moverse y de establecer uniones con otras
class Particle {
      constructor(){
        this.x = random(0,width);
        this.y = random(0,height);
        this.r = random(15,27);
        this.xSpeed = random(-2,9);
        this.ySpeed = random(-1,8);
      }
      createParticle(R,G,B,radio) {
        noStroke();
        fill(R,G,B,150);
        circle(this.x,this.y,this.r*radio);
      }
      moveParticle(velocity) {
        if(this.x < 0 || this.x > width)
          this.xSpeed*=-1;
        if(this.y < 0 || this.y > height)
          this.ySpeed*=-1;
        this.x+=(this.xSpeed*velocity);
        this.y+=(this.ySpeed*velocity);
      }
      joinParticles(R,G,B,maxDist) {
        particles.forEach(element =>{
          let dis = dist(this.x,this.y,element.x,element.y);
          if(dis<maxDist) { //maxdist 150 de normal
            stroke(R,G,B,50);
            strokeWeight(4);
            line(this.x,this.y,element.x,element.y);
          }
        });
      }
    }

function setup (){
    //Establecer conexión con los datos de Arduino
    serial = new p5.SerialPort();
    serial.openPort(Puerto);
    serial.on('connected', serverConnected);
    serial.on('list', gotList);
    serial.on ('error', serialError);
    serial.on ('data',gotData);
    serial.clear();
    //Sonido
    //Osciladores
    osc1 = new p5.Oscillator('sine');
    osc2 = new p5.Oscillator('sine');
    osc3 = new p5.Oscillator('sine');
    osc1.start();
    osc2.start();
    osc3.start();
    //Oscilador modulante
    modulator1 = new p5.Oscillator('sawtooth');
    modulator1.start();
    modulator1.disconnect();
    osc2.freq(modulator1);
    osc3.freq(modulator1);
    //Noise
    oscNoise = new p5.Noise();
    //herramienta de analisis de espectro
    fft = new p5.FFT();
    //reverb. Desconecta los osciladores del output para pasarlos por la reverb que incluye un DryWet(cantidad de efecto), IMPORTANTE: lo que va al mixer es el OUT del reverb
    reverb = new p5.Reverb();
    osc1.disconnect();
    osc2.disconnect();
    osc3.disconnect();
    oscNoise.disconnect();
    reverb.process(osc1, 3, 2);
    reverb.process(osc2, 3, 2);
    reverb.process(osc3, 3, 2);
    reverb.process(oscNoise,3,2);
    //Visuales
    //cantidad de particulas, se crean y se suman al array
    for(let i = 0;i<width/3;i++){
        particles.push(new Particle());
      }
}


function draw(){
    //Lectura de datos arduino
    if(datosquevienen != false){
        valorpot1 = Number(datosquevienen [0]);
        valorpot2 = Number(datosquevienen [1]);
        valorpot3 = Number(datosquevienen [2]);
        valorjoyX = Number(datosquevienen [3]);
        valorjoyY = Number(datosquevienen [4]);
        valorjoyBot = Number(datosquevienen [5]);
    } else { 
        return;
    }
    //Crea canvas y variables que se usaran después
    createCanvas (800,800);
    R = map(valorpot3,0,1023,255,150);
    G = 0;
    B = map(valorpot3,0,1023,0,255);
    radio = map(valorpot2,0,1023,0,2.5);
    velocity = map(valorpot1,0,1023,0.5,2.5);
    maxDist = map(valorjoyX,0,1023,0,300);
    background(0);
    //Feedback de datos de los sensores
    textSize(16);
    noFill();
    stroke(R,G,B);
    strokeWeight(1);
    text("valorpot1 " + valorpot1,20,50,0);
    text("valorpot2 " + valorpot2,130,50,0);
    text("valorpot3 " + valorpot3,240,50,0);
    text("valorjoyX " + valorjoyX,380,50,0);
    text("valorjoyY " + valorjoyY,490,50,0);
    text("valorjoyBot " + valorjoyBot,600,50,0);
    // analiza la forma de onda y la dibuja
    let waveform = fft.waveform();
    beginShape();
    strokeWeight(3);
    for (let i = 0; i < waveform.length; i++) {
      let x = map(i, 0, waveform.length, 0, width);
      let y = map(waveform[i], -1, 1, height, 0);
      vertex(x, y);
    }
    endShape();
    //Circulos que cambian de color y se mueven aleatoriamente. Según el potenciometro 2(amplitud) se juntan al centro o se dispersan.
    for(let i = 0; i<8 ;i++){
        stroke(random(100,200),0,random(100,200));
        ellipse(random(map(valorpot1,0,1023,400,0),map(valorpot1,0,1023,400,800)),random(0,800),map(valorpot2,0,1023,0,100));
      }
    //Controla la distancia maxima para que se genere una conexión entre particulas dependiendo del ejeY
    maxDist = map(valorjoyX,0,1023,300,0);
    //Particulas cambian de color según el pot3(reverb), tamaño según el pot2(amplitud), velocidad según el pot1 (frecuencia) y distancia de conexión entre ellas dependiendo del JoyX(Modulante)
    for(let i = 0;i<particles.length;i++) {
        particles[i].createParticle(R,G,B,radio);
        particles[i].moveParticle(velocity);
        particles[i].joinParticles(R,G,B,maxDist,particles.slice(i));
    }
    //Negativo y oscilador de noise al pulsar botón del joystick
    if (valorjoyBot == 0){
      oscNoise.start();
      oscNoise.amp(map(valorpot2,0,1023,0,0.3));
      loadPixels();
        for (var y = 0; y < height; y++) {
            for (var x = 0; x < width; x++) {
              var index = (x + y * width)*4;
              var r = pixels[index+0];
              var g = pixels[index+1];
              var b = pixels[index+2];
              var a = pixels[index+3];     
              pixels[index+0] = 255 - r;
              pixels[index+1] = 255 - g;
              pixels[index+2] = 255 - b;    
        }
      }
      updatePixels();
    }
    else{
      oscNoise.stop();
    }
    //Parte dedicada al sonido
    //Seleciona frecuencia (potenciometro1) y la amplitud (potenciometro2)
    osc1Freq = map(valorpot1,0,1023,40,440);
    osc2Freq = osc1Freq * 1.3;
    osc3Freq = osc1Freq * 1.7;
    osc1Amp = map(valorpot2,0,1023,0,1);
    osc2Amp = osc1Amp * 0.5;
    osc3Amp = osc1Amp * 0.7;
    //reverb (potenciometro3)
    let dryWet = constrain(map(valorpot3, 0, 1023, 0.3, 1), 0, 1);
    reverb.drywet(dryWet);
    //cambiar frecuencia (joyX) y amplitud(joyY) del la onda modulante (modula úicamente al segundo y tercer oscilador) 
    let modFreq = map(valorjoyX, 0, 1023, 0, 300);
    modulator1.freq(modFreq);
    let modAmp = map(valorjoyY, 0, 1023, -150, 300);
    modulator1.amp(modAmp);
    //ejecuta los inputs de la primera parte
    osc1.freq(osc1Freq);
    osc2.freq(osc2Freq);
    osc3.freq(osc3Freq);
    osc1.amp(osc1Amp);
    osc2.amp(osc2Amp);
    osc3.amp(osc3Amp);
}


//Funciones de feedback con arduino
function gotData (){
    let inData = serial.readStringUntil(";");
    datosquevienen = inData.split(',');
}

function serialError(err){
    print("error: " + err);
}

function serverConnected() {
    console.log("conectado")
    }
function gotList(thelist) {
    for (let i = 0; i < thelist.length; i++) {
    
    print(i + " " + thelist[i]);
    }
  }

