//express app ?
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs'); 
const path = require('path')
const { serialize, unserialize } = require('php-serialize');
const fileUpload = require('express-fileupload');
const app = express();
const port = 3000;
const firstFile = {
  name:   "Mon premier fichier",
  weight: "1054",
  ext:    "txt"
}
let sfirstFile;
let fileSended = new Object;
app.set('views', './views');
app.set('view engine', 'pug');
app.use(bodyParser.urlencoded({ extended: true }));

//================
//==    GET     ==  
//================
 
app.get('/', (req, res) => {
  res.render('index', {title:'Hey', message:"Hello world", drive:[]});
});

// app.get('/files',(req,res)=>{
//     res.send('Files page');
// })

//================
//==    POST    ==
//================

app.post('/files', (req, res) => {
    let post = req.body;
    fileSended.name=post.fichier;
    fileSended.title=post.nom_du_fichier;
    fileSended.ext=path.extname(post.fichier);
    console.log("post",req.headers);
    fs.readFile('./database/files.db', 'utf-8', (error, data)=>{
      if(error){
        console.log(error)
      }else{
        if(data==""){
          
          sfirstFile = serialize(firstFile);
        }
      }
    });
    res.render('index',{
        title: post.nom_du_fichier, 
        message: "Vous avez envoyez le fichier "+post.fichier,
        drive:[post.nom_du_fichier]
    })
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
})