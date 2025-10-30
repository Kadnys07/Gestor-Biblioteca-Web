    const { Pool } = require('pg');
    require('dotenv').config(); // Carrega o .env (só funciona em desenvolvimento)

    let pool;

  if (process.env.POSTGRES_URL) {
        // --- Bloco de Produção (Vercel) ---
        console.log("A conectar à base de dados de Produção (Vercel/Supabase)..."); // Log para depuração
        pool = new Pool({
            connectionString: process.env.POSTGRES_URL,
            ssl: false // ARQUITETO: Desliga explicitamente o SSL para corresponder ao Supabase
        });
    } else {
        
        console.log("A conectar à base de dados de Desenvolvimento (Local)..."); // Log para depuração
        pool = new Pool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_DATABASE,
            port: process.env.DB_PORT,
        });
    }

    
    pool.connect((err, client, release) => {
      if (err) {
        return console.error('Erro ao adquirir cliente do pool:', err.stack);
      }
      console.log('Conexão bem-sucedida ao banco de dados!');
      client.query('SELECT NOW()', (err, result) => {
        release(); // Libera o cliente de volta para o pool
        if (err) {
          return console.error('Erro ao executar query de teste:', err.stack);
        }
         console.log('Query de teste executada:', result.rows); 
      });
    });


    module.exports = pool;
    
