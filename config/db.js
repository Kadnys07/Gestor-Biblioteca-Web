    const { Pool } = require('pg');
    require('dotenv').config(); // Carrega o .env (só funciona em desenvolvimento)

    let pool;

    // A Vercel/Supabase injeta esta variável 'POSTGRES_URL' automaticamente
    if (process.env.POSTGRES_URL) {
        // --- Bloco de Produção (Vercel) ---
        console.log("A conectar à base de dados de Produção (Vercel/Supabase) COM SSL...");
        pool = new Pool({
            connectionString: process.env.POSTGRES_URL,
            // ARQUITETO (CORREÇÃO): O seu servidor Supabase exige SSL (Enforce SSL: ON).
            // Devemos usar SSL, mas dizer ao cliente para não ser rigoroso 
            // com a validação do certificado (o que causa o erro SELF_SIGNED_CERT_IN_CHAIN).
            ssl: {
                rejectUnauthorized: false 
            }
        });
    } else {
        // --- Bloco de Desenvolvimento (Sua máquina) ---
        console.log("A conectar à base de dados de Desenvolvimento (Local)...");
        pool = new Pool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_DATABASE,
            port: process.env.DB_PORT,
            // SSL é desnecessário para localhost
        });
    }

    
    // ARQUITETO: Logs de depuração para verificar a conexão no startup
    pool.connect((err, client, release) => {
      if (err) {
        return console.error('FALHA AO ADQUIRIR CLIENTE DO POOL:', err.stack);
      }
      console.log('CONEXÃO BEM-SUCEDIDA AO BANCO DE DADOS!');
      client.query('SELECT NOW()', (err, result) => {
        release(); // Libera o cliente de volta para o pool
        if (err) {
          return console.error('Erro ao executar query de teste (SELECT NOW):', err.stack);
        }
         // console.log('Query de teste executada:', result.rows); 
      });
    });


    module.exports = pool;

