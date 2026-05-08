import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { type TextSplitterConfig } from "./config.ts";

export class DocumentProcessor {
  private pdfPath: string;
  private textSplitterConfig: TextSplitterConfig;

  /**
   * Guarda as configuracoes necessarias para processar um PDF.
   *
   * A classe nao le o arquivo no construtor. Ela apenas armazena o caminho do
   * PDF e as regras de divisao do texto para que o carregamento aconteca depois,
   * de forma assincrona, dentro de loadAndSplit().
   *
   * @param pdfPath - Caminho do arquivo PDF que sera carregado.
   * @param textSplitterConfig - Tamanho dos chunks e sobreposicao entre eles.
   */
  constructor(pdfPath: string, textSplitterConfig: TextSplitterConfig) {
    this.pdfPath = pdfPath;
    this.textSplitterConfig = textSplitterConfig;
  }

  /**
   * Carrega o PDF, divide o texto em chunks e normaliza as metadatas.
   *
   * O fluxo desta funcao tem tres etapas:
   * 1. PDFLoader abre o arquivo e transforma cada pagina em um Document.
   * 2. RecursiveCharacterTextSplitter quebra o conteudo em trechos menores,
   *    respeitando chunkSize e chunkOverlap definidos no arquivo de config.
   * 3. O retorno e mapeado para manter apenas a metadata source, reduzindo o que
   *    sera gravado no Neo4j junto com cada chunk.
   *
   * @returns Lista de documentos menores, prontos para gerar embeddings.
   */
  async loadAndSplit() {
    // Cria o loader especifico para PDFs. Ele encapsula a leitura do arquivo e a
    // extracao do texto de cada pagina.
    const loader = new PDFLoader(this.pdfPath);

    // Le o PDF inteiro e devolve documentos brutos, normalmente um por pagina.
    const rawDocuments = await loader.load();
    console.log(`📄 Loaded ${rawDocuments.length} pages from PDF`);

    // Configura o divisor de texto. O RecursiveCharacterTextSplitter tenta
    // quebrar o texto em limites naturais antes de cortar no tamanho maximo.
    const splitter = new RecursiveCharacterTextSplitter(
      this.textSplitterConfig,
    );
    // Divide as paginas em chunks menores. A sobreposicao entre chunks ajuda a
    // preservar contexto quando uma ideia fica entre dois trechos.
    const documents = await splitter.splitDocuments(rawDocuments);
    console.log(`✂️  Split into ${documents.length} chunks`);

    // Recria cada documento mantendo seu conteudo e reduzindo a metadata para o
    // campo source. Isso evita persistir metadados extras que nao serao usados
    // pelo restante do exemplo.
    return documents.map((doc) => ({
      ...doc,
      metadata: {
        source: doc.metadata.source,
      },
    }));
  }
}
