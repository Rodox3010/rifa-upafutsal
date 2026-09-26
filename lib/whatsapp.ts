// Envia uma mensagem para o WhatsApp do administrador usando a
// API gratuita do CallMeBot (https://www.callmebot.com/blog/free-api-whatsapp-messages/).
//
// Como ativar (uma única vez, no celular do admin):
// 1. Adicione o número do CallMeBot aos contatos (está no link acima).
// 2. Envie a mensagem "I allow callmebot to send me messages" para esse contato.
// 3. Você vai receber de volta uma API Key. Guarde-a.
//
// Configure no .env:
//   ADMIN_WHATSAPP_PHONE=5511999999999   (com DDI, sem espaços/símbolos)
//   CALLMEBOT_API_KEY=xxxxxx
//
// É um serviço comunitário gratuito, mantido por um voluntário — ótimo
// para o volume baixo deste app (até 100 avisos), mas pode ter uma
// instabilidade ocasional. Se isso incomodar no futuro, dá para trocar
// por um bot no Telegram (mais estável e também gratuito) sem mudar o
// resto do app — só substitua o conteúdo desta função.
export async function notificarAdminWhatsapp(mensagem: string): Promise<void> {
  const phone = process.env.ADMIN_WHATSAPP_PHONE;
  const apiKey = process.env.CALLMEBOT_API_KEY;

  if (!phone || !apiKey) {
    console.error("ADMIN_WHATSAPP_PHONE ou CALLMEBOT_API_KEY não configurados");
    return;
  }

  const url =
    `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}` +
    `&text=${encodeURIComponent(mensagem)}&apikey=${encodeURIComponent(apiKey)}`;

  try {
    const resp = await fetch(url, { method: "GET" });
    if (!resp.ok) {
      console.error("Falha ao enviar WhatsApp:", resp.status, await resp.text());
    }
  } catch (err) {
    // Nunca deixamos uma falha de notificação derrubar a reserva do
    // número — o dado já está salvo no banco, o admin também pode
    // conferir pelo painel.
    console.error("Erro ao chamar CallMeBot:", err);
  }
}
