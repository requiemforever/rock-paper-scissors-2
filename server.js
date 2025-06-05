const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = 3000;

// Middleware
app.use(express.static(__dirname));
app.use(express.json());

// GET головна сторінка
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Проста перевірка API
app.get('/api', (req, res) => {
  res.send('Hello API World from Server!');
});

// POST: збереження гри у gamers.xml
app.post('/save-game', (req, res) => {
  const data = req.body;

  fs.readFile('gamers.xml', 'utf8', (err, content) => {
    let xml = content;

    if (err || !xml.includes('<gamers>')) {
      xml = `<?xml version="1.0"?>
<?xml-stylesheet type="text/xsl" href="gamers_table.xslt"?>
<gamers>
</gamers>`;
    }

    const newEntry = `
  <gamer>
    <login>${data.login}</login>
    <fullname>${data.fullname}</fullname>
    <dob>${data.dob}</dob>
    <email>${data.email}</email>
    <games>
      <game>
        <date>${data.game.date}</date>
        <level>${data.game.level}</level>
        <result>${data.game.result}</result>
        <rounds>
          ${data.game.rounds.map(r => `
            <round>
              <userMove>${r.user}</userMove>
              <botMove>${r.bot}</botMove>
              <outcome>${r.outcome}</outcome>
            </round>`).join('')}
        </rounds>
      </game>
    </games>
  </gamer>`;

    const updatedXml = xml.replace('</gamers>', `${newEntry}\n</gamers>`);

    fs.writeFile('gamers.xml', updatedXml, (err) => {
      if (err) return res.status(500).send('Помилка збереження');
      res.send('Гру збережено!');
    });
  });
});

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Сервер працює: http://localhost:${PORT}`);
});
