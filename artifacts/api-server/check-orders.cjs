const { Client } = require("pg");
const c = new Client({ connectionString: "postgresql://postgres:12345@localhost:5432/grocery_db" });
c.connect().then(async () => {
  const r = await c.query("SELECT o.id, o.store_id, s.name, s.owner_phone FROM orders o LEFT JOIN stores s ON s.id = o.store_id ORDER BY o.id DESC LIMIT 15");
  console.log(JSON.stringify(r.rows, null, 2));
  await c.end();
}).catch(e => { console.error("ERR", e.message); });
