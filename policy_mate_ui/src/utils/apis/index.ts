// filePath: policy_mate_ui/src/utils/apis/index.ts
export * from './upload';
export * from './documents';
export {
  sendMessage,
  fetchDocuments,
  stripMetadataTags,
  stripJsonFormatInstruction,
  stripBackendInstructions,
  extractMetadata,
  type MessageMetadata,
} from './documents';
