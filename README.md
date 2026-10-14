# ATLAS — Controle de Notebooks

Controle de saída e devolução de notebooks usando tags NFC.
Duas partes independentes que conversam por API:

```
atlas/
├── frontend/                  → vai para o repositório notebook-control-app (GitHub Pages)
│   ├── index.html             estrutura da página
│   ├── css/
│   │   └── style.css          todo o visual (cores, layout, celular)
│   ├── js/
│   │   ├── state.js           estado global e configuração salva no navegador
│   │   ├── utils.js           funções de apoio (datas, escape de texto, bind)
│   │   ├── api.js             chamadas à API e carga inicial dos dados
│   │   ├── nfc.js             leitura NFC pelo navegador (Chrome Android)
│   │   ├── tag-link.js        tag gravada como link (?tag=NB-001) + aviso "Tag reconhecida"
│   │   ├── views/
│   │   │   ├── layout.js      menu lateral e troca de telas
│   │   │   ├── dashboard.js   Painel (cartões, busca, filtro)
│   │   │   ├── cadastro.js    Cadastrar notebook
│   │   │   ├── editar.js      Editar notebook
│   │   │   ├── movimentar.js  Registro manual
│   │   │   ├── historico.js   Histórico e exportar CSV
│   │   │   └── config.js      Configurações (URL da API)
│   │   └── main.js            liga tudo e inicia o app
│   └── assets/                logo/ícones e manifest do atalho do iPhone
└── backend/                   → vai para o repositório notebook-control-api (Render)
    ├── pom.xml                dependências (Spring Boot 3, Java 17)
    ├── Dockerfile             build e execução no Render
    └── src/main/java/com/notebookcontrol/api/
        ├── NotebookControlApiApplication.java
        ├── controller/        endpoints REST
        ├── service/           regras de negócio, gravação dos dados e AdminService (senha e token)
        ├── model/             Notebook, Movimento e pedidos
        └── config/            CORS, chave de API, tratamento de erros
```

## Como publicar

**Frontend** (GitHub Pages): o conteúdo da pasta `frontend/` vai na **raiz** do repositório
`notebook-control-app` (o `index.html` precisa ficar na raiz, com as pastas `css`, `js` e `assets` ao lado).

**Backend** (Render): o conteúdo da pasta `backend/` vai na raiz do repositório `notebook-control-api`.
No Render, o serviço é um *Web Service* com Docker.

## Como o app reconhece a tag

Cada tag NFC é gravada (NFC Tools) com **um** registro de link:

    https://wellingtonsilva12.github.io/notebook-control-app/?tag=NB-001

Ao encostar o celular, o app abre, lê o `?tag=` e:
- notebook retirado → registra a devolução automaticamente;
- notebook disponível → pede o nome de quem retira;
- tag nova → abre o cadastro com o código preenchido.

Use um código diferente em cada tag (NB-001, NB-002…).

## API

| Método | Caminho | O que faz |
|---|---|---|
| GET | `/api/health` | teste de conexão |
| GET | `/api/notebooks` | lista os notebooks |
| POST | `/api/notebooks` | cadastra (`nome`, `patrimonio`, `nfcTag`) |
| PUT | `/api/notebooks/{id}` | edita nome e patrimônio (**admin**) |
| DELETE | `/api/notebooks/{id}` | exclui (**admin**) |
| GET | `/api/notebooks/by-tag/{tag}` | busca pela tag |
| POST | `/api/notebooks/{id}/liberar` | marca como devolvido sem o aluno (**admin**) |
| POST | `/api/admin/login` | troca a senha por um token de 8 horas |
| GET | `/api/movimentos` | histórico |
| DELETE | `/api/movimentos` | apaga todo o histórico (**admin**) |
| POST | `/api/movimentos` | registra saída/devolução (o servidor decide pelo status) |

Chave de API opcional: variável `API_KEY` no Render e campo "Chave de API" nas Configurações do app.

## Administrador (senha)

O menu tem a aba **Admin**. Só quem entra com a senha consegue editar, excluir e liberar notebooks e apagar o histórico;
nas outras telas esses botões nem aparecem.

A senha **não fica no app**: ela é conferida no servidor.

1. No Render, abra o serviço `notebook-control-api` → **Environment**.
2. Adicione a variável `ADMIN_PASSWORD` com a senha que você escolher e salve (o Render reinicia o servidor).
3. No app, aba **Admin**, digite a senha.

Detalhes de segurança: o login devolve um token assinado que vale 8 horas; o app guarda o token só na aba aberta
(some ao fechar); 5 senhas erradas seguidas bloqueiam novas tentativas por 1 minuto.
Sem `ADMIN_PASSWORD` definida, as ações de administrador ficam bloqueadas.

## Atenção

No Render grátis o arquivo de dados (`data/db.json`) é apagado quando o servidor reinicia ou é publicado de novo.
Para uso contínuo, troque por um banco gratuito (Neon ou Supabase).
