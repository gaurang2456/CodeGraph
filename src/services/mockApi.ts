import { FileCitation, IndexingStepStatus, Repository, RepositorySummary } from '@/types';
import { SAMPLE_REPOSITORIES } from './mockData';

export const INITIAL_INDEXING_STEPS: IndexingStepStatus[] = [
  { id: 'uploading', label: 'Uploading Repository', detail: 'Receiving codebase package & verifying integrity...', progress: 100, status: 'completed' },
  { id: 'extracting', label: 'Extracting Files', detail: 'Decompressing 64 files across 18 packages...', progress: 0, status: 'pending' },
  { id: 'reading', label: 'Reading Repository', detail: 'Parsing Abstract Syntax Trees (AST) & imports...', progress: 0, status: 'pending' },
  { id: 'chunking', label: 'Chunking Code', detail: 'Splitting code into semantic class & method blocks...', progress: 0, status: 'pending' },
  { id: 'embeddings', label: 'Generating Embeddings', detail: 'Vectorizing code chunks with 1,536 dimensions...', progress: 0, status: 'pending' },
  { id: 'saving', label: 'Saving Index', detail: 'Persisting vector embeddings to PgVector database...', progress: 0, status: 'pending' },
  { id: 'completed', label: 'Completed', detail: 'Codebase fully indexed and ready for AI querying!', progress: 0, status: 'pending' },
];

export interface StreamChatResult {
  answer: string;
  citations: FileCitation[];
  confidenceScore: number;
  implementationPlan?: {
    step: number;
    title: string;
    targetFile: string;
  }[];
}

export class MockApiService {
  /**
   * Simulates the 7-stage indexing process with animated callback updates.
   */
  static async startIndexing(
    repoName: string,
    onStepUpdate: (steps: IndexingStepStatus[]) => void
  ): Promise<Repository> {
    const steps = JSON.parse(JSON.stringify(INITIAL_INDEXING_STEPS)) as IndexingStepStatus[];
    
    // Stage 1: Uploading complete
    onStepUpdate([...steps]);
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Stage 2: Extracting
    steps[1].status = 'in_progress';
    steps[1].progress = 60;
    onStepUpdate([...steps]);
    await new Promise((resolve) => setTimeout(resolve, 600));
    steps[1].progress = 100;
    steps[1].status = 'completed';
    onStepUpdate([...steps]);

    // Stage 3: Reading
    steps[2].status = 'in_progress';
    steps[2].progress = 50;
    onStepUpdate([...steps]);
    await new Promise((resolve) => setTimeout(resolve, 600));
    steps[2].progress = 100;
    steps[2].status = 'completed';
    onStepUpdate([...steps]);

    // Stage 4: Chunking
    steps[3].status = 'in_progress';
    steps[3].progress = 70;
    onStepUpdate([...steps]);
    await new Promise((resolve) => setTimeout(resolve, 600));
    steps[3].progress = 100;
    steps[3].status = 'completed';
    onStepUpdate([...steps]);

    // Stage 5: Embeddings
    steps[4].status = 'in_progress';
    steps[4].progress = 40;
    onStepUpdate([...steps]);
    await new Promise((resolve) => setTimeout(resolve, 700));
    steps[4].progress = 100;
    steps[4].status = 'completed';
    onStepUpdate([...steps]);

    // Stage 6: Saving Index
    steps[5].status = 'in_progress';
    steps[5].progress = 80;
    onStepUpdate([...steps]);
    await new Promise((resolve) => setTimeout(resolve, 600));
    steps[5].progress = 100;
    steps[5].status = 'completed';
    onStepUpdate([...steps]);

    // Stage 7: Completed
    steps[6].status = 'completed';
    steps[6].progress = 100;
    onStepUpdate([...steps]);
    await new Promise((resolve) => setTimeout(resolve, 400));

    const isGithub = repoName.includes('/') || repoName.startsWith('http');
    const cleanName = repoName.replace('https://github.com/', '').replace('.git', '').split('/').pop() || repoName;

    const baseRepo = SAMPLE_REPOSITORIES[0];
    const newRepo: Repository = {
      ...baseRepo,
      id: `repo-${Date.now()}`,
      name: cleanName,
      fullName: isGithub ? repoName : `custom/${cleanName}`,
      url: isGithub ? (repoName.startsWith('http') ? repoName : `https://github.com/${repoName}`) : undefined,
      lastIndexedAt: 'Just now',
      summary: {
        ...baseRepo.summary,
        description: `Successfully indexed repository ${cleanName}. Automatically analyzed architecture layers, dependencies, and REST endpoints.`
      }
    };

    return newRepo;
  }

  /**
   * Simulates AI RAG chat stream with citation matching and implementation steps.
   */
  static async streamChatResponse(
    prompt: string,
    onChunk: (text: string) => void
  ): Promise<StreamChatResult> {
    const lower = prompt.toLowerCase();
    
    let answer = `Your application uses Spring Security and JWT authentication. The cleanest approach is to add Google OAuth2 alongside the existing authentication flow.`;
    let plan: StreamChatResult['implementationPlan'] = [
      { step: 1, title: 'Add dependencies', targetFile: 'pom.xml' },
      { step: 2, title: 'Configure Google OAuth', targetFile: 'application.yml' },
      { step: 3, title: 'OAuth success handler', targetFile: 'SecurityConfig.java' },
      { step: 4, title: 'Update security config', targetFile: 'SecurityConfig.java' },
      { step: 5, title: 'Handle user persistence', targetFile: 'AuthService.java' }
    ];
    let citations: FileCitation[] = [
      {
        filename: 'SecurityConfig.java',
        path: 'src/main/java/com/example/loan/config/SecurityConfig.java',
        language: 'java',
        snippet: 'http.authorizeHttpRequests(auth -> auth.requestMatchers("/api/auth/**").permitAll())',
        lineRange: 'L25-L38'
      },
      {
        filename: 'application.yml',
        path: 'src/main/resources/application.yml',
        language: 'yaml',
        snippet: 'spring.security.oauth2.client.registration.google.client-id',
        lineRange: 'L10-L18'
      }
    ];

    if (lower.includes('loan') || lower.includes('eligibility') || lower.includes('calculate')) {
      answer = `Loan eligibility is evaluated inside \`LoanEvaluationService.java\`. It checks whether credit score is >= 680 and calculates the maximum debt-to-income ratio based on monthly income and requested EMI.`;
      plan = [
        { step: 1, title: 'Fetch Bureau Score', targetFile: 'CreditScoreService.java' },
        { step: 2, title: 'Underwrite Eligibility', targetFile: 'LoanEvaluationService.java' },
        { step: 3, title: 'Persist Application State', targetFile: 'LoanApplicationController.java' }
      ];
      citations = [
        {
          filename: 'LoanEvaluationService.java',
          path: 'src/main/java/com/example/loan/services/LoanEvaluationService.java',
          language: 'java',
          snippet: 'boolean isEligible = creditScore >= 680 && (request.getMonthlyIncome() * 0.5) > request.getRequestedEmi();',
          lineRange: 'L20-L32'
        }
      ];
    } else if (lower.includes('redis') || lower.includes('cache')) {
      answer = `Redis is utilized in \`CreditScoreService.java\` to cache external credit score checks for 24 hours under key format \`credit_score:{taxId}\`, preventing excessive third-party API latency.`;
      plan = [
        { step: 1, title: 'Check Redis Cache', targetFile: 'CreditScoreService.java' },
        { step: 2, title: 'Configure TTL & Port', targetFile: 'application.yml' }
      ];
      citations = [
        {
          filename: 'CreditScoreService.java',
          path: 'src/main/java/com/example/loan/services/CreditScoreService.java',
          language: 'java',
          snippet: 'redisTemplate.opsForValue().set(cacheKey, String.valueOf(score), 24, TimeUnit.HOURS);',
          lineRange: 'L22-L28'
        }
      ];
    }

    // Stream word by word
    const words = answer.split(' ');
    let currentText = '';
    for (let i = 0; i < words.length; i++) {
      currentText += (i === 0 ? '' : ' ') + words[i];
      onChunk(currentText);
      await new Promise((resolve) => setTimeout(resolve, 20));
    }

    return {
      answer,
      citations,
      confidenceScore: 0.98,
      implementationPlan: plan
    };
  }

  /**
   * Simulates summary regeneration.
   */
  static async regenerateSummary(repo: Repository): Promise<RepositorySummary> {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return {
      ...repo.summary,
      description: repo.summary.description + ' (Updated with active architecture graph scan).'
    };
  }
}
