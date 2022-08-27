const { Telegraf } = require("telegraf");
const { exec: execAsync } = require("child-process-async");

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.command("start", (ctx) => {
  console.log(ctx.from);
  bot.telegram.sendMessage(
    ctx.chat.id,
    "Bella zio, siamo caldi come stufe. Per trovare una carta digita [[nomecarta]]",
    {}
  );
});

bot.on("text", async (ctx) => {
  var regExp = /\[\[([^)]+?)\]\]/g;

  while(null != (matches = regExp.exec(ctx.message.text))) {

    console.log(matches);

    var encoded = encodeURIComponent(matches[1]);

    var url = "https://api.scryfall.com/cards/named?exact=" + encoded;

    var result = await execAsync(`curl -X GET ${url} `);
    
    if (result != undefined && result.stdout != undefined) {
      var responseJson = JSON.parse(result.stdout);
      if (
        responseJson.image_uris != undefined &&
        responseJson.image_uris.border_crop != undefined
      ) {
        bot.telegram.sendPhoto(ctx.chat.id, {
          url: responseJson.image_uris.border_crop,
        })
      }
    }
 }
});

bot.launch();
