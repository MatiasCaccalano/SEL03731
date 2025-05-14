// Carrega variáveis de ambiente do arquivo .env
require("dotenv").config();
const mongoose = require("mongoose");

// Importa o módulo Express e cria uma instância da aplicação
const express = require("express");
const app = express();
const PORT = 3000

// Importa o módulo path para manipulação de caminhos de diretórios
const path = require("path");

// Importa o body-parser para processar dados de formulários
const bodyParser = require("body-parser");
// Sessões
const session = require("express-session");
const MongoStore = require("connect-mongo");

conexao();

// Configura o body-parser para interpretar dados URL-encoded
app.use(bodyParser.urlencoded({ extended: true }));


const sessionOptions = {
  secret: 'sua-chave-ultra-secreta-aqui', //process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 } // 1 hour
};

app.use(session(sessionOptions));

// Torna `user` disponível em res.locals para os templates
app.use((req, res, next) => {
  res.locals.user = req.session.user; 
  next();
});

// Configura o middleware para servir arquivos estáticos da pasta "public"
app.use(express.static(path.join(__dirname, "public")));

// Configura o diretório de views e define o motor de templates para Pug
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

// Rota para a página inicial (index.pug) passando o título "Home"
app.get("/", (req, res) => {
  console.log("User session:", req.session.user); // Log para verificação (depuração)
  console.log("Session ID:", req.session.id); // Log para verificação (depuração)
  res.render("index", { title: "Home" });
});

// Middleware para processar dados enviados via URL-encoded e JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Importa e utiliza o roteador de usuários
const userRouter = require("./routes/users");
app.use("/users", userRouter);

// Importa e utiliza o roteador de envio de arquivos
const sendFiles = require("./routes/send-files");
app.use("/send-files", sendFiles);

// Importa e utiliza o roteador de envio de arquivos
const projeto1 = require("./routes/projeto1");
app.use("/projeto1", projeto1);

// Inicia o servidor na porta 6005
app.listen(PORT, '0.0.0.0', () => {
  console.log("Server on port 6005");
});

async function conexao() {
  try{
    await mongoose.connect("mongodb://127.0.0.1:27017/users");
  } catch (error){
    console.error('Erro ao conectar na db',error);
    throw error;
  }
}