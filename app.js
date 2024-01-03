const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { serialize, unserialize } = require('php-serialize');
const multer = require('multer');

const app = express();
const port = 3000;

// Charger les fichiers existants depuis la base de données
let uploadedFiles = {};
let uniqId = () =>{
    let n = Math.floor(Math.random() * (122 - 65) + 65);
    while(n>=91 && n<=96)
      n = Math.floor(Math.random() * (122 - 65) + 65);
    let k = Math.floor(Math.random() * 1000000);
    let m = String.fromCharCode(n) + k;
    return m;
}

const getFiles = (req) => {
  let fileType;
  
  switch(req.file.mimetype){
    case 'audio/mpeg':
    case 'audio/wav':
    case 'audio/ogg':
    case 'audio/mp4':
    case 'audio/mp3':
        fileType = "audio";
        break;
    case 'image/jpeg':
    case 'image/png':
    case 'image/gif':
    case 'image/webp':
        fileType = "image";
        break;
    case 'text/plain':
        fileType = "text";
        break;
    case 'application/pdf':
        fileType = "pdf";
        break;
  }
  let fileInfo = {...req.file,'fileType':fileType}
  // Récupérez les informations sur le fichier téléchargé
  let file = {
    id: uniqId(),
    title: req.body.filename,
    info: fileInfo,
  };

  console.log("file", file);
  return file
  }

const readFilePromise = () => {
  return new Promise((resolve, reject) => {
    fs.readFile('./database/files.db', 'utf-8', (error, data) => {
      if (error) {
        reject(error);
      } else {
        if (data == "") {
          uploadedFiles = {};
        } else {
          uploadedFiles = unserialize(data);
        }
        resolve(uploadedFiles);
      }
    });
  });
};

const writeFilePromise = (data) => {
  return new Promise((resolve, reject) => {
    fs.writeFile('./database/files.db', serialize(data), (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

app.set('views', './views');
app.set('view engine', 'pug');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public/drive'));

const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'public/drive');
  },
  filename: function(req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|mp3|txt)$/)) {
      return cb(new Error('Seuls les fichiers d\'image, son ou texte sont autorisés.'));
    }
    cb(null, true);
  }
});

//================
//==    GET     ==
//================

app.get('/', (req, res) => {
  // Utilisation de la promesse
  readFilePromise()
    .then((uploadedFiles) => {
      const files = uploadedFiles ? Object.values(uploadedFiles) : [];
      console.log("files",files);
      res.render('index', { title: 'Mon drive', message: "Bienvenue sur le drive", files: files });
    })
    .catch((error) => {
      console.error(error);
      res.render('index', { title: 'Mon drive', message: error, files: [] });
    });
});


// Récupération des fichiers dans le dossier public/drive
app.get('/public/drive/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, 'public/drive', filename);

  fs.stat(filePath, (err, stat) => {
    if (err) {
      console.error(err);
      res.sendStatus(404);
    } else {
      const range = req.headers.range;
      const fileSize = stat.size;

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] 
          ? parseInt(parts[1], 10)
          : fileSize-1;

        const chunksize = (end-start)+1;
        const file = fs.createReadStream(filePath, {start, end});
        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'audio/mp3',
        };

        res.writeHead(206, head);
        file.pipe(res);
      } else {
        const head = {
          'Content-Length': fileSize,
          'Content-Type': 'audio/mp3',
        };
        res.writeHead(200, head);
        fs.createReadStream(filePath).pipe(res);
      }
    }
  });
});

//================
//==    POST    ==
//================

app.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send("No files were uploaded.");
  }
  let file = getFiles(req);
  // Ajoutez les informations à l'objet JSON
  try {
    let uploadedFile = await readFilePromise();
    uploadedFile = file;
    // Enregistrez l'objet JSON sérialisé dans un fichier
    await writeFilePromise([uploadedFile]);
    console.log(`File ${req.file.filename} uploaded and file info saved.`);
  } catch (error) {
    console.error(error);
  }

  readFilePromise()
    .then((uploadedFiles) => {
      const files = uploadedFiles ? Object.values(uploadedFiles) : [];
      res.render('index', { title: 'Mon drive', message: "Bienvenue sur le drive", files: files });
    })
    .catch((error) => {
      console.error(error);
      res.render('index', { title: 'Mon drive', message: error, files: [] });
    });
});


//================
//==  UPLOAD    ==
//================

app.listen(port, () =>{
  console.log(`Example app listening on port ${port}`);
});
