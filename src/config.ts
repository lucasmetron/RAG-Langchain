import type { DataType, PretrainedModelOptions } from "@huggingface/transformers";

export interface TextSplitterConfig {
    // Quantidade maxima de caracteres que cada chunk deve ter apos a divisao do texto.
    chunkSize: number;

    // Quantidade de caracteres repetidos entre chunks consecutivos para preservar contexto.
    chunkOverlap: number;
}

// Objeto central de configuracao do projeto. O Object.freeze impede alteracoes
// acidentais em tempo de execucao, deixando claro que esses valores devem ser
// tratados como constantes durante o processamento.
export const CONFIG = Object.freeze({
    // Configuracoes usadas pelo LangChain para conectar no Neo4j e localizar o
    // indice vetorial onde os embeddings dos chunks serao armazenados.
    neo4j: {
        url: process.env.NEO4J_URI!,
        username: process.env.NEO4J_USER!,
        password: process.env.NEO4J_PASSWORD!,
        indexName: "tensors_index",
        searchType: "vector" as const,
        textNodeProperties: ["text"],
        nodeLabel: "Chunk",
    },
    // Configuracao de um provedor de LLM via OpenRouter. Neste exemplo atual ela
    // fica disponivel no CONFIG, embora o fluxo principal de embeddings e busca
    // semantica nao a utilize diretamente.
    openRouter: {
        nlpModel: process.env.NLP_MODEL,
        url: "https://openrouter.ai/api/v1",
        apiKey: process.env.OPENROUTER_API_KEY,
        temperature: 0.3,
        maxRetries: 2,
        defaultHeaders: {
            "HTTP-Referer": process.env.OPENROUTER_SITE_URL,
            "X-Title": process.env.OPENROUTER_SITE_NAME,
        }
    },
    // Caminho do PDF usado como fonte de conhecimento para gerar os chunks.
    pdf: {
        path: "./tensores.pdf",
    },
    // Regras de divisao do texto extraido do PDF. O overlap ajuda a nao perder
    // contexto quando uma explicacao atravessa a fronteira entre dois chunks.
    textSplitter: {
        chunkSize: 1000,
        chunkOverlap: 200,
    },
    // Modelo que transforma texto em embeddings. As opcoes pretrainedOptions
    // controlam detalhes de carregamento/precisao do modelo da Hugging Face.
    embedding: {
        modelName: process.env.EMBEDDING_MODEL!,
        pretrainedOptions: {
            dtype: "fp32" as DataType, // Options: 'fp32' (best quality), 'fp16' (faster), 'q8', 'q4', 'q4f16' (quantized)
        } satisfies PretrainedModelOptions,
    },
    // Quantidade de trechos mais similares retornados para cada pergunta.
    similarity: {
        topK: 3,
    },
});
