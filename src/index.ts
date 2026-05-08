import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/huggingface_transformers";
import { CONFIG } from "./config.ts";
import { DocumentProcessor } from "./documentProcessor.ts";
import { type PretrainedOptions } from "@huggingface/transformers";
import { Neo4jVectorStore } from "@langchain/community/vectorstores/neo4j_vector";
import { displayResults } from "./util.ts";

let _neo4jVectorStore = null;

/**
 * Remove todos os nos de documentos gravados no Neo4j para o label informado.
 *
 * Esta funcao e usada antes de repopular a base vetorial. Como os documentos
 * sao inseridos novamente a cada execucao do script, limpar os nos antigos evita
 * duplicidade de chunks e impede que buscas por similaridade retornem trechos de
 * execucoes anteriores.
 *
 * @param vectorStore - Instancia do Neo4jVectorStore ja conectada ao Neo4j.
 * @param nodeLabel - Label dos nos que representam os chunks dos documentos.
 */
async function clearAll(
  vectorStore: Neo4jVectorStore,
  nodeLabel: string,
): Promise<void> {
  console.log("🗑️  Removendo todos os documentos existentes...");
  // Executa uma consulta Cypher diretamente no Neo4j. O DETACH DELETE remove o
  // no e tambem todos os relacionamentos ligados a ele.
  await vectorStore.query(`MATCH (n:\`${nodeLabel}\`) DETACH DELETE n`);
  console.log("✅ Documentos removidos com sucesso\n");
}

try {
  console.log("🚀 Inicializando sistema de Embeddings com Neo4j...\n");

  // Cria o processador responsavel por ler o PDF e quebrar seu conteudo em
  // partes menores. Essas partes, chamadas chunks, sao melhores para gerar
  // embeddings e para recuperar respostas mais precisas nas buscas semanticas.
  const documentProcessor = new DocumentProcessor(
    CONFIG.pdf.path,
    CONFIG.textSplitter,
  );
  // Carrega o PDF configurado, divide o texto em chunks e devolve documentos no
  // formato esperado pelo LangChain.
  const documents = await documentProcessor.loadAndSplit();

  // Inicializa o modelo local da Hugging Face que transforma texto em vetores
  // numericos. Esses vetores representam o significado semantico dos textos.
  const embeddings = new HuggingFaceTransformersEmbeddings({
    model: CONFIG.embedding.modelName,
    pretrainedOptions: CONFIG.embedding.pretrainedOptions as PretrainedOptions,
  });
  // const response = await embeddings.embedQuery(
  //     "JavaScript"
  // )
  // const response = await embeddings.embedDocuments([
  //     "JavaScript"
  // ])
  // console.log('response', response)

  // Conecta o LangChain ao grafo existente no Neo4j usando as configuracoes de
  // indice vetorial, propriedades de texto e label definidas em CONFIG.neo4j.
  _neo4jVectorStore = await Neo4jVectorStore.fromExistingGraph(
    embeddings,
    CONFIG.neo4j,
  );

  // Limpa a colecao anterior de chunks para que a execucao atual comece com uma
  // base consistente e sem documentos repetidos.
  await clearAll(_neo4jVectorStore, CONFIG.neo4j.nodeLabel);

  // Insere os chunks um por vez. Ao adicionar cada documento, o vector store
  // calcula o embedding do texto e grava no Neo4j os dados necessarios para a
  // busca vetorial.
  for (const [index, doc] of documents.entries()) {
    console.log(`✅ Adicionando documento ${index + 1}/${documents.length}`);
    await _neo4jVectorStore.addDocuments([doc]);
  }
  console.log("\n✅ Base de dados populada com sucesso!\n");

  // ==================== STEP 2: RUN SIMILARITY SEARCH ====================
  console.log("🔍 ETAPA 2: Executando buscas por similaridade...\n");
  const questions = [
    "O que são tensores e como são representados em JavaScript?",
    "Como converter objetos JavaScript em tensores?",
    "O que é normalização de dados e por que é necessária?",
    "Como funciona uma rede neural no TensorFlow.js?",
    "O que significa treinar uma rede neural?",
    "o que é hot enconding e quando usar?",
  ];

  for (const question of questions) {
    console.log(`\n${"=".repeat(80)}`);
    console.log(`📌 PERGUNTA: ${question}`);
    console.log("=".repeat(80));

    // Converte a pergunta em embedding, compara esse vetor com os vetores dos
    // chunks salvos no Neo4j e retorna os topK trechos mais parecidos.
    const results = await _neo4jVectorStore.similaritySearch(
      question,
      CONFIG.similarity.topK,
    );
    // Formata a saida no terminal para facilitar a leitura dos trechos
    // encontrados e de suas paginas de origem, quando essa metadata existir.
    displayResults(results);
    // console.log(results)
  }

  // Cleanup
  console.log(`\n${"=".repeat(80)}`);
  console.log("✅ Processamento concluído com sucesso!\n");
} catch (error) {
  console.error("error", error);
} finally {
  // Fecha a conexao com o Neo4j mesmo quando ocorre erro no processamento. O
  // optional chaining evita falha caso a conexao nao tenha sido criada.
  await _neo4jVectorStore?.close();
}
