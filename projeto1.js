// Importações
const express = require("express");
const router = express.Router();
const mqtt = require('mqtt');
const path = require("path");
const projeto_1 = require("../models/projeto_1"); // ALTERAÇÃO
const fileUpload = require("express-fileupload");

module.exports = function(io) {

const router = express.Router();

// Vetor para armazenar os registros
const registrosProjeto1 = [];

// Objeto para armazenar os pesos recebidos via MQTT
const pesosPorIdentificador = {};

// Conexão MQTT
const client = mqtt.connect('mqtt://igbt.eesc.usp.br', {
 username: 'mqtt',
 password: 'mqtt_123_abc'
});

// Definição do topico associado ao projeto 1
const mqtt_topic = 'vaquinha/echo';//recebe dados de id, peso. é subscribed
const mqtt_topic_send = 'vaquinha'; //envia dados id, allowed
// Qnd conectar ao broker MQTT ...
client.on('connect', () => {
client.subscribe(mqtt_topic, (err) => {
 if (err) {
console.error(`Erro ao se inscrever no tópico ${mqtt_topic}: ${err}`);
 } else {
 console.log(`Inscrito com sucesso no tópico: ${mqtt_topic}`);
 }
});
});


//Recebimento dos dados via mqtt 
client.on('message', async (topic, payload) => {
  if (topic === 'vaquinha/echo') {
    try {
      const mensagem = JSON.parse(payload.toString());
      const { identifier, peso } = mensagem;

      if (identifier && peso != null) {
        await projeto_1.findOneAndUpdate({identifier: identifier},{peso:peso, dataPesoAtualizado: new Date().toISOString()});
        console.log(`MQTT: Peso atualizado - ${identifier}: ${peso}kg`);
        client.publish('logs/vaquinha',`MQTT: Peso atualizado - ${identifier}: ${peso}kg`);
        //console.log("Emitindo socket pesoAtualizado:", { identifier, peso });
        io.emit('pesoAtualizado', { identifier, peso });
      }
    } catch (e) {
      console.error("Erro ao processar mensagem MQTT:", e.message);
    }
  }
});



// Middleware de teste para simular sessão de usuário caso login dê errado tirar fim do projeto
 
// Middleware de teste para simular sessão de usuário caso login dê errado
router.use((req, res, next) => {
 if (!req.session.user) {
 req.session.user = { id: 1, username: 'vitorinha123_noUser' };
 }
 next();
});


// Rota GET principal do projeto
router.get('/', async (req, res) => {
 try {
   const registros = await projeto_1.find(); // Busca os registros no banco de dados
   res.render('projeto1', {
   success: req.query.success,
   error: req.query.error,
   registros: registros, // Mudança de registrosProjeto1 --> registros
   user: req.session.user
});
   } catch (err) {
      console.error("Erro ao buscar registros do banco:", err);
   res.status(500).send("Erro ao carregar registros");
 }
 });


// Rota POST para registrar um animal
router.post('/register', async (req, res) => {
 const { identifier, allowed } = req.body;

 if (!req.session.user) {
   return res.status(401).send('Usuário não autenticado');
 }

  const peso = pesosPorIdentificador[identifier] || "Não recebido";
  const existente = registrosProjeto1.find(reg => reg.identifier === identifier);
  const registroPeso = pesosPorIdentificador[identifier];
 try {
      const existente = await projeto_1.findOne({ identifier });
      const novoRegistro = new projeto_1({
         identifier,
         allowed,
         peso: registroPeso?.peso || "Não recebido",
         registradoPor: req.session.user.username,
         data: new Date().toISOString()
 });

 if (existente) {
// Atualiza o registro existente
 existente.allowed = allowed;
 existente.peso = registroPeso?.peso || existente.peso; // Mantém o peso antigo se não houver atualização via MQTT
 existente.dataPesoAtualizado = registroPeso?.dataAtualizacao || existente.dataPesoAtualizado;
 existente.registradoPor = req.session.user.username;
 existente.data = new Date().toISOString();
 
 await existente.save(); // Salva as alterações no banco
 console.log('Registro atualizado:', existente);

} else {
// Se não existir, cria um novo registro
   await novoRegistro.save(); // Salva no banco
   console.log('Novo registro:', novoRegistro);
  }

  // Envia mensagem MQTT com 'identifier' e 'allowed'
  const mensagemMQTT = JSON.stringify({ identifier, allowed });
  client.publish(mqtt_topic, mensagemMQTT, {}, (err) => {
   if (err) console.error('Erro ao enviar mensagem MQTT:', err);

   else console.log(`Mensagem enviada via MQTT: ${mensagemMQTT}`);

});

 } catch (err) {
  console.error("Erro ao registrar/atualizar animal:", err);
  res.redirect('/projeto1?error=Erro ao registrar/atualizar animal'); // Adicionei mensagem de erro
 }


  // Envia mensagem MQTT com 'id,allowed'

  //const mensagemMQTT = JSON.stringify({identifier, allowed});
  const mensagemMQTT = `${identifier},${allowed}`;

  client.publish(mqtt_topic_send, mensagemMQTT, {}, (err) => {
    if (err){ 
      console.error('Erro ao enviar mensagem MQTT:', err);
      //client.publish('logs/vaquinha', `Erro ao enviar mensagem MQTT:'`);
    }
    else {
      console.log(`Mensagem enviada via MQTT: ${mensagemMQTT}`);
      client.publish('logs/vaquinha', `Mensagem enviada via MQTT: ${mensagemMQTT}`);
  }
});

  res.redirect('/projeto1?success=Animal registrado/atualizado com sucesso'); // Adicionei mensagem de sucesso
});

// Rota para excluir um animal pelo identifier
router.post('/delete/:identifier', async (req, res) => {
 const { identifier } = req.params;

  const index = registrosProjeto1.findIndex(r => r.identifier === identifier);
  if (index !== -1) {
    registrosProjeto1.splice(index, 1);
    //console.log(`Animal ${identifier} removido.`);
    client.publish('logs/vaquinha', `Animal ${identifier} removido.`);

  } else {
    //console.log(`Animal ${identifier} não encontrado para remoção.`);
    client.publish('logs/vaquinha', `Animal ${identifier} não encontrado para remoção.`);
  }
 try {
  const result = await projeto_1.deleteOne({ identifier });

 if (result.deletedCount === 1) { // Correção: 'deleteCount' para 'deletedCount'
 console.log(`Animal ${identifier} removido.`);
 res.redirect('/projeto1?success=Animal removido com sucesso'); // Adicionei mensagem de sucesso
} else {
 console.log(`Animal ${identifier} não encontrado para remoção`);
 res.redirect('/projeto1?error=Animal não encontrado para remoção'); // Adicionei mensagem de erro
 }
} catch (err) {
 console.log('Erro ao remover o registro:', err);
 res.status(500).send('Erro ao excluir o registro');
}
});

// Rota GET para ver os registros como JSON
 router.get('/registered', async (req, res) => {
 try {
 const registros = await projeto_1.find(); // Busca todos os registros no banco
 res.json(registros);
 } catch (err) {
 res.status(500).send('Erro ao buscar registros');
 }
});

// Exporta o router
//module.exports = router;
return router;
}
