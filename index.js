const { Telegraf } = require("telegraf");
const { exec: execAsync } = require("child-process-async");

require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.command("start", (ctx) => {
  bot.telegram.sendMessage(
    ctx.chat.id,
    "Bella zio, siamo caldi come stufe. Per trovare una carta digita [[nomecarta]], aggiungi $ davanti al nome per avere il prezzo, e se vuoi specificare il set usa \"|\" \n"
    + "Ex.: [[$ lightning bolt | SLD]]",
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

    //Gestione ricerca prezzo
    var findPrice = false;
    if(cardName[0] == "$"){
      cardName = cardName.substring(1).trim();
      findPrice = true;
    }

    var nameEncoded = encodeURIComponent(cardName);
    var url = "https://api.scryfall.com/cards/named?fuzzy=" + nameEncoded;
    if(setName){
      var setEncoded = encodeURIComponent(setName);
      url += "&set=" + setEncoded;
    }

    var result = await execAsync(`curl -X GET \"${url}\" `);
    
    if (result != undefined && result.stdout != undefined) {
      var responseJson = JSON.parse(result.stdout);
      if (
        responseJson.image_uris != undefined &&
        responseJson.image_uris.border_crop != undefined
      ) {
        if(findPrice){
          var message = `€: ${responseJson.prices.eur ?? "non trovato"}`;
          if(responseJson.prices.eur_foil){
            message += `  |  € Foil: ${responseJson.prices.eur_foil}`;
          }
          bot.telegram.sendMessage(ctx.chat.id, message);
        } else {
          bot.telegram.sendPhoto(ctx.chat.id, {
            url: responseJson.image_uris.border_crop,
          });
        }
      } else {
        bot.telegram.sendMessage(ctx.chat.id, "Belin, sta carta te la sei sognata");
      }
    }
 }
});

bot.launch();
