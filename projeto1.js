// Importações
const express = require("express");
const router = express.Router();
const mqtt = require('mqtt');
const path = require("path");
const fileUpload = require("express-fileupload");
const mongoose = require("mongoose");

const animalSchema = new mongoose.Schema({
  //Cria a id da tag do animal
  identifier: {
      type: String,
      required: true
  },
  allowed:{
    type: String
  },
  //Cria a variavel para armazenar o peso
  peso: {
      type: String
  },
  registradoPor:{
    type: String
  },
},{
  //Cria uma vairavel que guarda quando o documento
  //foi criado e outra para a ultima vez que ela foi atualizada
  timestamps: true
});

const animal = mongoose.model("animal", animalSchema);

// Vetor para armazenar os registros
const registrosProjeto1 = [];

// Variável para guardar o último peso recebido
const pesosPorIdentificador = {};

// Conexão MQTT
const client = mqtt.connect('mqtt://igbt.eesc.usp.br', {
  username: 'mqtt',
  password: 'mqtt_123_abc'
});

// Definição do topico associado ao projeto 1
const mqtt_topic = 'vaquinha';

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
client.on('message', (topic, payload) => {
  try {
    const mensagem = JSON.parse(payload.toString());
    const { identifier, peso } = mensagem;

    if (identifier && peso != null) {
      pesosPorIdentificador[identifier] = {
        peso,
        dataAtualizacao: new Date().toISOString()
      };
      console.log(`MQTT: Peso atualizado - ${identifier}: ${peso}kg`);
    }
  } catch (e) {
    console.error("Erro ao processar mensagem MQTT:", e.message);
  }
});

// Middleware de teste para simular sessão de usuário caso login dê errado
router.use((req, res, next) => {
  if (!req.session.user) {
    req.session.user = { id: 1, username: 'vitorinha123_noUser' }; 
  }
  next();
});

// Rota GET principal do projeto
router.get('/', (req, res) => {
  res.render('projeto1', {
    success: req.query.success,
    error: req.query.error,
    registros: registrosProjeto1,
    user: req.session.user
  });  
});

// Rota POST para registrar um animal
router.post('/register', (req, res) => {
  const { identifier, allowed } = req.body;

  if (!req.session.user) {
    return res.status(401).send('Usuário não autenticado');
  }

  const peso = pesosPorIdentificador[identifier] || "Não recebido";
  //const existente = registrosProjeto1.find(reg => reg.identifier === identifier);
  const existente = encontraAnimal(identifier).then(existente =>{
    const registroPeso = pesosPorIdentificador[identifier];
 
  const novoRegistro = {
    identifier,
    allowed,
    peso: registroPeso?.peso || "Não recebido",
    dataPesoAtualizado: registroPeso?.dataAtualizacao || null,
    registradoPor: req.session.user.username,
    data: new Date().toISOString()
  };
  
  if (existente) {
    updateAnimal(existente,allowed,peso,req.session.user.username);
    //existente.allowed = allowed;
    //existente.peso = peso;
    //existente.registradoPor = req.session.user.username;
    //existente.data = new Date().toISOString();
    console.log('Registro atualizado:', existente);
  } else {
      novo = animalNovo(identifier,allowed,peso,req.session.user.username).then(novo=>{
        registrosProjeto1.push(novo);
        console.log('Novo registro:', novo);
      });
    }
    //const novo = {
    //  identifier,
    //  allowed,
    //  peso,
    //  registradoPor: req.session.user.username,
    //  data: new Date().toISOString()
    //};
  


  // Envia mensagem MQTT com 'id,allowed'
  const mensagemMQTT = JSON.stringify({ identifier, allowed });
  client.publish(mqtt_topic, mensagemMQTT, {}, (err) => {
    if (err) console.error('Erro ao enviar mensagem MQTT:', err);
    else console.log(`Mensagem enviada via MQTT: ${mensagemMQTT}`);

  });

  res.redirect('/projeto1');
  });
  
});

// Rota para excluir um animal pelo identifier
router.post('/delete/:identifier', (req, res) => {
  const { identifier } = req.params;
  //const index = registrosProjeto1.findIndex(r => r.identifier === identifier);
  index = deletaAnimal(identifier).then(index=>{
    if (index) {
      registrosProjeto1.splice(index, 1);
      console.log(`Animal ${identifier} removido.`);
    } else {
      console.log(`Animal ${identifier} não encontrado para remoção.`);
    }
  
    res.redirect('/projeto1');
  });
});

// Rota GET para ver os registros como JSON
router.get('/registered', (req, res) => {
  res.json(registrosProjeto1);
});

async function encontraAnimal(identifier) {
  try{
    const existe = await animal.findOne({identifier:identifier});
    return existe;
  } catch (error){
    console.error('Erro ao encontrar o existente',error);
    throw error;
  }
}

async function updateAnimal(existe,allowed,peso,user) {
  try{
    await animal.findByIdAndUpdate({_id:existe._id},{peso:peso, allowed:allowed,registradoPor:user});
  } catch (error){
    console.error('Erro ao encontrar e atualizar',error);
    throw error;
  }
}

async function animalNovo(id,allowed,peso,user) {
  try{
    await animal.create({identifier:id,peso:peso, allowed:allowed,registradoPor:user});
  } catch (error){
    console.error('Erro ao criar um animal novo',error);
    throw error;
  }
}

async function encontraAnimal(identifier) {
  try{
    const existe = await animal.findOneAndDelete({identifier:identifier});
    return existe;
  } catch (error){
    console.error('Erro ao deletar o animal',error);
    throw error;
  }
}

// Exporta o router
module.exports = router;
