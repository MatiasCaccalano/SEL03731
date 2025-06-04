const axios = require("axios");
const mqtt = require('mqtt');
const path = require("path");
const express = require("express");

module.exports = function(io) {
// Importações

const router = express.Router();

const registrosmapa = [];
const registrostemp = [];
const registrosvento = [];
const registrosumidade = [];
 
// Conexão MQTT
const client = mqtt.connect('mqtt://igbt.eesc.usp.br', {
  username: 'mqtt',
  password: 'mqtt_123_abc'
});

const mqtt_topics = [
    'mapa',
    'temperatura',
    'umidade',
    'sensor-de-vento'
  ];
  
  // Quando conectar ao broker MQTT
client.on('connect', () => {
    client.subscribe(mqtt_topics, (err) => {
        if (err) {
            console.error(`Erro ao se inscrever nos tópicos: ${mqtt_topics.join(', ')}`, err);
            client.publish('logs/proj2',`Erro ao se inscrever nos tópicos`);
        } else {
            console.log(`Inscrito com sucesso nos tópicos: ${mqtt_topics.join(', ')}`);
            client.publish('logs/proj2', `Inscrito com sucesso nos tópicos: ${mqtt_topics.join(', ')}`);
        }
        });
});


//Recebimento dos dados via mqtt 
client.on('message', async (topic, payload) => {
  if (topic === 'mapa') {
    try {
      const mensagem = JSON.parse(payload.toString());
      const { lat, long } = mensagem;

      registrosmapa.push(mensagem);
      console.log(`MQTT: Mapa atualizado - ${lat}: ${long}`);

      // Emite coordenadas para o frontend
      io.emit('nova-coordenada', { lat, lon: long });

      // Faz requisição à API de clima
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${long}&current_weather=true`;
      const { data } = await axios.get(url);

      const clima = {
        temperatura: data.current_weather.temperature,
        vento: data.current_weather.windspeed,
        codigoTempo: data.current_weather.weathercode,
        horario: data.current_weather.time
      };
      

      // Envia dados meteorológicos para o frontend
      io.emit('dados-clima', clima);
      console.log("Emitido dados-clima:", clima);

    } catch (e) {
      console.error("Erro ao processar mensagem MQTT:", e.message);
    }
  }
    if (topic ==='temperatura'){
        try {
            const mensagem = JSON.parse(payload.toString());
            const { temperatura } = mensagem;
            registrostemp.push(mensagem);
            console.log(`MQTT: Temp atualizado - ${temperatura}`);
            const novoReg = new projeto_2({
              tipo: 'temperatura',
              valor: parseFloat(temperatura),
            });
            await novoReg.save();
            console.log('Novo registro:', novoReg);
          } catch (e) {
            console.error("Erro ao processar mensagem MQTT:", e.message);
          }
    }
    if (topic ==='umidade'){
        try {
            const mensagem = JSON.parse(payload.toString());
            const { umidade } = mensagem;
            registrosumidade.push(mensagem);
            console.log(`MQTT: Umidade atualizado - ${umidade}`);
            const novoReg = new projeto_2({
            tipo: 'umidade',
            valor: parseFloat(umidade),
            });
            await novoReg.save();
            console.log('Novo registro:', novoReg);
          } catch (e) {
            console.error("Erro ao processar mensagem MQTT:", e.message);
          }
    }
    if (topic ==='sensor-de-vento'){
        try {
            const mensagem = JSON.parse(payload.toString());
            const { velocidade } = mensagem;
            registrosumidade.push(mensagem);
            console.log(`MQTT: Sensor vento atualizado - ${velocidade}`);
            const novoReg = new projeto_2({
            tipo: 'velocidade',
            valor: parseFloat(velocidade),
            });
            await novoReg.save();
            console.log('Novo registro:', novoReg);
          } catch (e) {
            console.error("Erro ao processar mensagem MQTT:", e.message);
          }
    }
  });

  router.get('/', (req, res) => {
    res.render('projeto2', {
      success: req.query.success,
      error: req.query.error,
      registrosmapa: registrosmapa,
      registrostemp: registrostemp,
      registrosvento: registrosvento,
      registrosumidade: registrosumidade,
      user: req.session.user
    });  
  });


return router;
}
// Exporta o router
//module.exports = router;
