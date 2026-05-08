import type { Document } from "@langchain/core/documents";

/**
 * Exibe no terminal os documentos retornados pela busca por similaridade.
 *
 * A funcao recebe a lista de resultados do Neo4jVectorStore, imprime a
 * quantidade encontrada e percorre cada documento para mostrar um resumo do seu
 * conteudo. Quando a metadata possui pageNumber, tambem exibe a pagina de
 * origem para ajudar a localizar o trecho no PDF.
 *
 * @param results - Documentos considerados mais semelhantes a pergunta feita.
 */
function displayResults(results: Array<Document<Record<string, any>>>): void {
    console.log(`\n📄 Encontrados ${results.length} trechos relevantes:\n`);

    // Percorre cada resultado junto com sua posicao na lista, permitindo mostrar
    // uma numeracao amigavel comecando em 1.
    results.forEach((doc, index) => {
        console.log(`   ${index + 1}.`);

        // Mostra apenas um trecho do conteudo para manter a saida do terminal
        // legivel, principalmente quando os chunks sao longos.
        console.log(`      ${formatContent(doc.pageContent)}`);

        // Alguns documentos podem nao trazer pageNumber. Por isso a verificacao
        // usa optional chaining antes de tentar imprimir a pagina.
        if (doc.metadata?.pageNumber) {
            console.log(`      📄 (Página: ${doc.metadata.pageNumber})`);
        }
        console.log();
    });
}

/**
 * Limpa e encurta um texto para exibicao no console.
 *
 * Primeiro substitui quebras de linha, tabs e multiplos espacos por um unico
 * espaco. Depois remove espacos do inicio e do fim. Se o texto final for maior
 * que maxLength, retorna apenas os primeiros caracteres e adiciona reticencias.
 *
 * @param content - Texto original que veio de um chunk do documento.
 * @param maxLength - Quantidade maxima de caracteres exibidos.
 * @returns Texto limpo e, se necessario, truncado.
 */
function formatContent(content: string, maxLength: number = 200): string {
    // Normaliza os espacos para que o trecho apareca em uma unica linha no
    // terminal, mesmo que o PDF tenha quebras de linha no meio das frases.
    const cleaned = content.replace(/\s+/g, ' ').trim();

    // Evita que chunks grandes poluam a saida. Quando o texto ja cabe no limite,
    // retorna o conteudo completo.
    return cleaned.length > maxLength
        ? `${cleaned.substring(0, maxLength)}...`
        : cleaned;
}

export {
    displayResults
}
