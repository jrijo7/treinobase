# 🏋️‍♂️ TreinoBase

> Plataforma B2B2C de Alta Performance para Prescrição e Execução de Treinos.

O **TreinoBase** é uma aplicação SaaS minimalista projetada para revolucionar a conexão entre Personal Trainers e seus alunos. Com um design focado na estética "Old Money" (limpo, escuro e direto ao ponto), a plataforma resolve o gargalo da prescrição engessada através de uma arquitetura de dados adaptável e sincronização em tempo real.

## 🚀 Principais Funcionalidades

*   **Construtor de Treinos Dinâmico (Professores):** Sistema de prescrição modular que utiliza o poder do `JSONB` no PostgreSQL. Permite criar desde treinos simples (Flat) até periodizações complexas divididas em blocos (A, B, C) sem quebrar o banco de dados.
*   **Live Workout Engine (Alunos):** Interface de execução de treino imersiva. O aluno pode editar cargas (kg) e repetições reais na hora, marcando o check em cada série.
*   **Sincronização B2B2C Instantânea:** Assim que o aluno finaliza uma sessão, o volume total levantado e o status de frequência são atualizados imediatamente no painel de Taxa de Aderência do Personal Trainer.
*   **Sistema de Vinculação Seguro:** Conexão Aluno-Professor feita através de convites e validação no banco de dados, com travas de segurança e preparação para Paywall (Assinaturas baseadas em limite de alunos).

## 🛠️ Stack de Tecnologias

*   **Front-end:** React.js, Vite, TypeScript
*   **Estilização:** Tailwind CSS (Dark Mode / Minimalista), Lucide Icons
*   **Back-end & BaaS:** Supabase
*   **Banco de Dados:** PostgreSQL (Uso intensivo de colunas `JSONB` e consultas relacionais)
*   **Runtime & Package Manager:** Bun

## 🧠 Arquitetura de Dados

O grande diferencial técnico do TreinoBase é a fuga de tabelas relacionais engessadas para exercícios. Ao adotar `JSONB` na tabela `treinos`, o aplicativo atinge **Deep Hydration**: o front-end é capaz de desestruturar qualquer formato de ficha (divisões, rotinas ou blocos) através de um Extrator Universal, garantindo resiliência e zero quebras na tela do aluno.

## ⚙️ Como rodar o projeto localmente

1. Clone este repositório:
   ```bash
   git clone [https://github.com/seu-usuario/treinobase.git](https://github.com/seu-usuario/treinobase.git)