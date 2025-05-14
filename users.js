// Importa o módulo Express e cria um roteador
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

// Importa o módulo bcrypt para hashing de senhas
const bcrypt = require("bcrypt");
const saltRounds = 10; // Define a quantidade de rounds para gerar o salt

// Variável para armazenar os usuários (in-memory, apenas para teste)
let users = [];

// Rota GET para exibir a página de registro de novo usuário
router.get("/register", (req, res) => {
  // Renderiza a view "register" e passa um erro nulo inicialmente
  res.render("register", { error: null });
});

const usuarioSchema = new mongoose.Schema({
  //Cria o campo para armazenar o nome do usuario
  user: {
      type: String,
      //Obriga que esse campo seja preenchido ao criar um documento
      required: true
  },
  //Campo para guardar a hash do usuario
  hash: {
      type: String,
      required: true
  },
  //Define se o usuario pertence ao grupo 1 ou grupo 2
  grupo: {
      type: Number
  }
},{
  timestamps: true
});
const usuario = mongoose.model("usuario", usuarioSchema);

// Rota GET para exibir a página de login
router.get("/", (req, res) => {
  // Renderiza a view "login" e passa um erro nulo inicialmente
  res.render("login", { error: null });
});

// Rota POST para processar o login do usuário
router.post("/login", (req, res) => {
  const { username, password, project } = req.body;
  
  // Procura um usuário com o username fornecido
  //const user = users.find(u => u.username === username);
  const user = usuario.findOne({user:username}).then(user=>{
    console.log(user);
    if (!user) {
      // Se o usuário não for encontrado, renderiza a página de login com mensagem de erro
      return res.render("login", { error: "Usuário ou senha incorretos!" });
    }
  
    // Compara a senha fornecida com o hash armazenado usando bcrypt
    bcrypt.compare(password, user.hash, (err, result) => {
      if (err) {
        console.log("Resultado da Comparação:", err); // Log para verificação (depuração)
        // Em caso de erro na comparação, retorna erro 500
        return res.status(500).send("Erro na autenticação!");
      }
      console.log("Comparison Result:", result); // Log para verificação (depuração)
      if (result) {
        // Se as senhas coincidirem, redireciona para a rota de envio de arquivos
        req.session.user = {
          username: user.username
        };
        console.log("User logado", user.username)
        //req.session.user = { username }; // salva usuário na sessão
        if(user.project ==1){
          return res.redirect("/projeto1");
        }
        else{
          return res.redirect("/send-files");
        }
        
      } else {
        // Se não coincidirem, renderiza a página de login com mensagem de erro
        return res.render("login", { error: "Usuário ou senha incorretos!" });
      }
    });
  });
  });
  

// Rota POST para registrar um novo usuário
router.post("/register", (req, res) => {
  const { username, password, project } = req.body;
  
  // Verifica se já existe um usuário com o mesmo username
  //const userExists = users.some(user => user.username === username);
  const userExists = usuario.exists({user:username}).then(userExists =>{
    console.log(userExists);
    if (userExists) {
    // Se o usuário já existe, renderiza a página de registro com uma mensagem de erro
    return res.render("register", { error: "Usuário já existe!" });}
    // Hash a senha usando bcrypt antes de armazenar o usuário
  bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) {
      // Em caso de erro durante o hash, retorna erro 500
      return res.status(500).send("Erro ao processar a senha.");
    }
    console.log("Hashed password:", hash); // Log do hash (remova em produção)
    // Adiciona o novo usuário ao array, armazenando o username e o hash da senha
    users.push({ username, password: hash, project });
    console.log("Projeto:", project);
    usuario_upload(username,hash, project);
    // Redireciona para a página de login após o registro bem-sucedido
    res.redirect("/users");
  });
  })
  
  
});

// Rota GET para logout: destrói a sessão e redireciona para login
router.get("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error("Erro ao encerrar sessão:", err);
    }
    res.redirect("/users");
  });
});

// Exporta o roteador para utilização em outras partes da aplicação

async function usuario_upload(username,hash, project){
  try{
    //await mongoose.connection.useDb('users');
    const existe = await usuario.create({user:username,hash:hash,grupo:project});
    console.log(existe);
  } catch (error){
    console.error('Erro ao fazer o upload na db',error);
    throw error;
  }
}

module.exports = router;