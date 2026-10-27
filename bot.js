const util = require('minecraft-server-util');
const mysql = require('mysql2/promise');

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASS, // Пароль берется из настроек Render, а не из кода!
    database: process.env.DB_NAME
};

async function checkServers() {
    let conn;
    try {
        conn = await mysql.createConnection(dbConfig);
        const [servers] = await conn.execute('SELECT id, ip, port FROM servers');
        
        console.log(`Проверяю ${servers.length} серверов...`);

        for (const s of servers) {
            try {
                const res = await util.status(s.ip, s.port, { timeout: 5000 });
                console.log(`[ONLINE] ${s.ip} - ${res.players.online} игроков`);
                await conn.execute(
                    'UPDATE servers SET status = "online", players_online = ?, players_max = ?, last_online_at = NOW() WHERE id = ?',
                    [res.players.online, res.players.max, s.id]
                );
            } catch (e) {
                console.log(`[OFFLINE] ${s.ip}`);
                await conn.execute(
                    'UPDATE servers SET status = "offline", players_online = 0, players_max = 0 WHERE id = ?',
                    [s.id]
                );
            }
        }
    } catch (err) {
        console.error('Ошибка БД:', err.message);
    } finally {
        if (conn) await conn.end();
    }
}

checkServers();
setInterval(checkServers, 300000); 