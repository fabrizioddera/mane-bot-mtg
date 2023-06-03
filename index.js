const { Telegraf } = require("telegraf");
const { exec: execAsync } = require("child-process-async");

require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);

const http = require("http");

const server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Hello World");
});

server.listen(process.env.PORT || 8080)

bot.command("start", (ctx) => {
  bot.telegram.sendMessage(
    ctx.chat.id,
    "Bella zio, siamo caldi come stufe. Per trovare una carta digita [[nomecarta]] \n"
    + "Ex.: [[ lightning bolt ]]",
    {}
  );
});

bot.command("info", (ctx) => {
  bot.telegram.sendMessage(
    ctx.chat.id,
    "[[ nome carta ]] = ricerca immagine carta\n"
    + "[[ nome carta | codiceset ]] = cerca la versione di un set specifico\n"
    + "Parametri opzionali prima del nome:\n"
    + "# = legalità nei formati\n"
    + "$ = prezzo\n"
    + "% = testo oracle ufficiale\n"
    + "it_ = versione italiana (o nella lingua specificata)",
    {}
  );
});

bot.command("languages", (ctx) => {
  bot.telegram.sendMessage(
    ctx.chat.id,
    "Traduzioni disponibili (per alcune carte):\n"
    +"en = Inglese\n"
    +"es = Spagnolo\n"
    +"fr = Francese\n"
    +"de = Tedesco\n"
    +"it = Italiano\n"
    +"pt = Portoghese\n"
    +"ja = Giapponese\n"
    +"ko = Coreano\n"
    +"ru = Russo\n"
    +"zhs = Cinese Semplificato\n"
    +"zht = Cinese Tradizionale\n"
    +"ph = Phyrexiano\n",
    {}
  );
});

bot.on("text", async (ctx) => {
  var regExp = /\[\[([^)]+?)\]\]/g;

  while(null != (matches = regExp.exec(ctx.message.text))) {
   
    var inputString = matches[1];
    var split = inputString.split("|");
    var cardName = split[0].trim();
    //Gestione codice espansione
    var setName = split[1] ? split[1].trim() : null;

    //Gestione ricerche risorse specifiche
    var specificResource = null;
    var requestedLanguage = null;
    if(cardName[0] == "$"){
      cardName = cardName.substring(1).trim();
      specificResource = "price";
    }
    else if(cardName[0] == "#"){
      cardName = cardName.substring(1).trim();
      specificResource = "legality";
    }
    else if(cardName[0] == "%"){
      cardName = cardName.substring(1).trim();
      specificResource = "oracle";
    }
    else if(cardName.includes("_")){
      var languageSplit = cardName.split("_");
      requestedLanguage = languageSplit[0].trim();
      cardName = languageSplit[1].trim();
      specificResource = "language";
    }

    var nameEncoded = encodeURIComponent(cardName);
    var url = "https://api.scryfall.com/cards/named?fuzzy=" + nameEncoded;
    if(setName){
      var setEncoded = encodeURIComponent(setName);
      url += "&set=" + setEncoded;
    }

    var res = await fetch(url);
    
    if (res.ok) {
      var responseJson = await res.json();
      
      //Gestione Double Faced Cards
      var numFaces = 0;

      if(responseJson.image_uris != undefined && responseJson.image_uris.border_crop != undefined ){
        numFaces = 1;
      }
      else if (responseJson.card_faces != undefined && responseJson.card_faces.length > 0 ){
        numFaces = 2;
      }

      if (numFaces > 0) {
        if(specificResource == "price"){
          var message = `€: ${responseJson.prices.eur ?? "non trovato"}`;
          if(responseJson.prices.eur_foil){
            message += `  |  € Foil: ${responseJson.prices.eur_foil}`;
          }
          bot.telegram.sendMessage(ctx.chat.id, message);
        } 
        else if(specificResource == "legality"){
          var message = 
            `standard:  ${responseJson.legalities.standard.replaceAll("_"," ")}\n`
          + `pioneer:   ${responseJson.legalities.pioneer.replaceAll("_"," ")}\n`
          + `modern:    ${responseJson.legalities.modern.replaceAll("_"," ")}\n`
          + `legacy:    ${responseJson.legalities.legacy.replaceAll("_"," ")}\n`
          + `vintage:   ${responseJson.legalities.vintage.replaceAll("_"," ")}\n`
          + `commander: ${responseJson.legalities.commander.replaceAll("_"," ")}\n`
          + `pauper:    ${responseJson.legalities.pauper.replaceAll("_"," ")}`;
          
          bot.telegram.sendMessage(ctx.chat.id, message);
        } 
        else if(specificResource == "oracle"){
          var message = `${responseJson.oracle_text ?? "non trovato"}`;
          bot.telegram.sendMessage(ctx.chat.id, message);
        }
        else if(specificResource == "language"){
          var errMessage = "Carta non trovata nella lingua richiesta";
          var imageUrls = [];
          var versionsUrl = responseJson.prints_search_uri + "&include_multilingual=true";

          var resVersions = await fetch(versionsUrl);
          if (resVersions.ok){
            var versionsJson = await resVersions.json();
            versionsJson.data.forEach(v => {
              if(imageUrls.length == 0 && v.lang == requestedLanguage && (setName == null || setName == v.set)){
                debugger;
                if(v.image_uris != undefined && v.image_uris.border_crop != undefined ){
                  imageUrls.push(v.image_uris.border_crop);
                }
                else if (v.card_faces != undefined && v.card_faces.length > 0 ){
                  v.card_faces.forEach(face => {
                    imageUrls.push(face.image_uris.border_crop)
                  });
                }
              }
            });
          }

          if(imageUrls.length > 0){
            imageUrls.forEach(u => {
              bot.telegram.sendPhoto(ctx.chat.id, {
                url: u,
              });
            });
          }
          else {
            bot.telegram.sendMessage(ctx.chat.id, errMessage);
          }
        } 
        else {
          if(numFaces == 1){
            bot.telegram.sendPhoto(ctx.chat.id, {
              url: responseJson.image_uris.border_crop,
            });
          }
          else {
            responseJson.card_faces.forEach(face => {
              bot.telegram.sendPhoto(ctx.chat.id, {
                url: face.image_uris.border_crop,
              });
            });
          }
        }
      } else {
        bot.telegram.sendMessage(ctx.chat.id, "Belin, sta carta te la sei sognata");
      }
    }
    else {
      var responseJson = await res.json();
      if(responseJson.status == 404){
        if(responseJson.type == "ambiguous"){
          bot.telegram.sendMessage(ctx.chat.id, "Ho trovato troppa roba, aiutami a restringere il cerchio");
        } else {
          bot.telegram.sendMessage(ctx.chat.id, "Belin, sta carta te la sei sognata");
        }
      }
      else {
        bot.telegram.sendMessage(ctx.chat.id, "Qualcosa è andato storto, chiedi al mane che sviluppa di guardare i log");
      }
    }
 }
});

bot.launch();
