// Gera o "Pix copia e cola" (payload EMV) localmente, sem chamar
// nenhuma API externa — reduz dependências e superfície de ataque.

function tlv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

// Remove acentos e caracteres fora do padrão aceito pelo Pix
function limpar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .trim();
}

function crc16(payload: string): string {
  let crc = 0xffff;
  const polinomio = 0x1021;

  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ polinomio) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function gerarPayloadPix(params: {
  chave: string;
  nomeRecebedor: string;
  cidade: string;
  valor?: number;
  txid: string; // identificador da transação — usamos o número da rifa
}): string {
  const nome = limpar(params.nomeRecebedor).slice(0, 25) || "RECEBEDOR";
  const cidade = limpar(params.cidade).slice(0, 15) || "BRASIL";
  const txid = limpar(params.txid).slice(0, 25) || "***";

  const merchantAccountInfo =
    tlv("00", "br.gov.bcb.pix") + tlv("01", params.chave);

  const additionalData = tlv("05", txid);

  let payload =
    tlv("00", "01") +
    tlv("26", merchantAccountInfo) +
    tlv("52", "0000") +
    tlv("53", "986") +
    (params.valor ? tlv("54", params.valor.toFixed(2)) : "") +
    tlv("58", "BR") +
    tlv("59", nome) +
    tlv("60", cidade) +
    tlv("62", additionalData) +
    "6304";

  return payload + crc16(payload);
}
