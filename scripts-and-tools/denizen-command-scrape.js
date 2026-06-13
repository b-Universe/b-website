const https = require('https');

const repos = [
  'https://api.github.com/repos/DenizenScript/Denizen-Core/git/trees/master?recursive=1',
  'https://api.github.com/repos/DenizenScript/Denizen/git/trees/dev?recursive=1'
];

const commands = new Set();
let completed = 0;

const options = {
  headers: { 'User-Agent': 'Denizen-Scraper' }
};

repos.forEach(url => {
  https.get(url, options, (res) => {
    let data = '';
    
    res.on('data', chunk => { 
      data += chunk; 
    });
    
    res.on('end', () => {
      const json = JSON.parse(data);
      
      if (json.tree) {
        json.tree.forEach(item => {
          if (item.path.includes('/commands/') && item.path.endsWith('Command.java')) {
            const parts = item.path.split('/');
            const filename = parts[parts.length - 1];
            const cmdName = filename.replace('Command.java', '').toLowerCase();
            commands.add(cmdName);
          }
        });
      }
      
      completed++;
      
      if (completed === repos.length) {
        const sortedCommands = Array.from(commands).sort();
        console.log(sortedCommands);
        console.log(`\nTotal unique commands found: ${sortedCommands.length}`);
      }
    });
  }).on('error', err => {
    console.error(`Error fetching data: ${err.message}`);
  });
});
