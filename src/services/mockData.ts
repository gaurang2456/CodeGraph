import { Repository, GraphNode, GraphEdge, FileTreeNode } from '@/types';

export const LOAN_MANAGEMENT_FILE_TREE: FileTreeNode = {
  id: 'root',
  name: 'loan-management',
  path: '',
  type: 'folder',
  isOpen: true,
  children: [
    {
      id: 'src-main-java',
      name: 'src/main/java',
      path: 'src/main/java',
      type: 'folder',
      isOpen: true,
      children: [
        {
          id: 'com-example-loan',
          name: 'com.example.loan',
          path: 'src/main/java/com/example/loan',
          type: 'folder',
          isOpen: true,
          children: [
            {
              id: 'folder-config',
              name: 'config',
              path: 'src/main/java/com/example/loan/config',
              type: 'folder',
              isOpen: true,
              children: [
                {
                  id: 'file-security-config',
                  name: 'SecurityConfig.java',
                  path: 'src/main/java/com/example/loan/config/SecurityConfig.java',
                  type: 'file',
                  language: 'java'
                },
                {
                  id: 'file-app-config',
                  name: 'AppConfig.java',
                  path: 'src/main/java/com/example/loan/config/AppConfig.java',
                  type: 'file',
                  language: 'java'
                }
              ]
            },
            {
              id: 'folder-controllers',
              name: 'controllers',
              path: 'src/main/java/com/example/loan/controllers',
              type: 'folder',
              isOpen: true,
              children: [
                {
                  id: 'file-auth-controller',
                  name: 'AuthController.java',
                  path: 'src/main/java/com/example/loan/controllers/AuthController.java',
                  type: 'file',
                  language: 'java'
                },
                {
                  id: 'file-loan-controller',
                  name: 'LoanApplicationController.java',
                  path: 'src/main/java/com/example/loan/controllers/LoanApplicationController.java',
                  type: 'file',
                  language: 'java'
                }
              ]
            },
            {
              id: 'folder-services',
              name: 'services',
              path: 'src/main/java/com/example/loan/services',
              type: 'folder',
              isOpen: true,
              children: [
                {
                  id: 'file-auth-service',
                  name: 'AuthService.java',
                  path: 'src/main/java/com/example/loan/services/AuthService.java',
                  type: 'file',
                  language: 'java'
                },
                {
                  id: 'file-loan-service',
                  name: 'LoanEvaluationService.java',
                  path: 'src/main/java/com/example/loan/services/LoanEvaluationService.java',
                  type: 'file',
                  language: 'java'
                },
                {
                  id: 'file-credit-service',
                  name: 'CreditScoreService.java',
                  path: 'src/main/java/com/example/loan/services/CreditScoreService.java',
                  type: 'file',
                  language: 'java'
                }
              ]
            },
            {
              id: 'folder-repositories',
              name: 'repositories',
              path: 'src/main/java/com/example/loan/repositories',
              type: 'folder',
              isOpen: false,
              children: [
                {
                  id: 'file-user-repo',
                  name: 'UserRepository.java',
                  path: 'src/main/java/com/example/loan/repositories/UserRepository.java',
                  type: 'file',
                  language: 'java'
                },
                {
                  id: 'file-loan-repo',
                  name: 'LoanRepository.java',
                  path: 'src/main/java/com/example/loan/repositories/LoanRepository.java',
                  type: 'file',
                  language: 'java'
                }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'src-main-resources',
      name: 'src/main/resources',
      path: 'src/main/resources',
      type: 'folder',
      isOpen: true,
      children: [
        {
          id: 'file-application-yml',
          name: 'application.yml',
          path: 'src/main/resources/application.yml',
          type: 'file',
          language: 'yaml'
        }
      ]
    },
    {
      id: 'file-pom-xml',
      name: 'pom.xml',
      path: 'pom.xml',
      type: 'file',
      language: 'xml'
    }
  ]
};

export const LOAN_MANAGEMENT_NODES: GraphNode[] = [
  {
    id: 'auth-controller',
    label: 'AuthController',
    category: 'controller',
    icon: 'api',
    x: 80,
    y: 170,
    file: 'src/main/java/com/example/loan/controllers/AuthController.java',
    details: 'Handles user authentication, token issuance, and session revocation.',
    methods: ['login(LoginRequest)', 'register(RegisterRequest)', 'refreshToken()']
  },
  {
    id: 'loan-controller',
    label: 'LoanApplicationController',
    category: 'controller',
    icon: 'api',
    x: 80,
    y: 380,
    file: 'src/main/java/com/example/loan/controllers/LoanApplicationController.java',
    details: 'Exposes endpoints for submitting loans, EMI calculations, and status checks.',
    methods: ['applyLoan(LoanRequest)', 'getLoanStatus(id)', 'calculateEMI(amount, rate, term)']
  },
  {
    id: 'auth-service',
    label: 'AuthService',
    category: 'service',
    icon: 'settings_b_roll',
    x: 360,
    y: 200,
    file: 'src/main/java/com/example/loan/services/AuthService.java',
    details: 'Encapsulates BCrypt password verification and JWT token generation.',
    methods: ['authenticate(user, pass)', 'generateToken(user)', 'validateToken(jwt)']
  },
  {
    id: 'loan-service',
    label: 'LoanEvaluationService',
    category: 'service',
    icon: 'settings_b_roll',
    x: 360,
    y: 360,
    file: 'src/main/java/com/example/loan/services/LoanEvaluationService.java',
    details: 'Core business engine determining eligibility, debt-to-income limits, and repayment terms.',
    methods: ['evaluateEligibility(app)', 'computeInterestSchedule()', 'approveLoan(id)']
  },
  {
    id: 'credit-service',
    label: 'CreditScoreService',
    category: 'service',
    icon: 'settings_b_roll',
    x: 360,
    y: 500,
    file: 'src/main/java/com/example/loan/services/CreditScoreService.java',
    details: 'Asynchronous credit check connector with Redis cache for bureau scores.',
    methods: ['fetchCreditScore(pan)', 'cacheScore(pan, score)']
  },
  {
    id: 'user-repo',
    label: 'UserRepository',
    category: 'repository',
    icon: 'folder_data',
    x: 640,
    y: 200,
    file: 'src/main/java/com/example/loan/repositories/UserRepository.java',
    details: 'Spring Data JPA repository interfacing with MySQL `users` and `roles` tables.',
    methods: ['findByEmail(email)', 'existsByEmail(email)', 'save(user)']
  },
  {
    id: 'loan-repo',
    label: 'LoanRepository',
    category: 'repository',
    icon: 'folder_data',
    x: 640,
    y: 380,
    file: 'src/main/java/com/example/loan/repositories/LoanRepository.java',
    details: 'Spring Data JPA repository managing loan records, payment transactions, and audits.',
    methods: ['findByApplicantId(userId)', 'findPendingLoans()', 'updateStatus(id, status)']
  },
  {
    id: 'database-node',
    label: 'MySQL / Redis Storage',
    category: 'database',
    icon: 'dns',
    x: 900,
    y: 290,
    details: 'Relational persistence via MySQL 8.0 with InnoDB engine and Redis for session cache.',
    methods: ['Schema: loan_db', 'Tables: 14', 'Cache: redis:6379']
  }
];

export const LOAN_MANAGEMENT_EDGES: GraphEdge[] = [
  { id: 'e1', source: 'auth-controller', target: 'auth-service', label: 'calls', type: 'calls' },
  { id: 'e2', source: 'loan-controller', target: 'loan-service', label: 'calls', type: 'calls' },
  { id: 'e3', source: 'loan-controller', target: 'credit-service', label: 'uses', type: 'uses' },
  { id: 'e4', source: 'auth-service', target: 'user-repo', label: 'accesses', type: 'accesses' },
  { id: 'e5', source: 'loan-service', target: 'loan-repo', label: 'accesses', type: 'accesses' },
  { id: 'e6', source: 'credit-service', target: 'loan-repo', label: 'queries', type: 'queries' },
  { id: 'e7', source: 'user-repo', target: 'database-node', label: 'persists', type: 'queries' },
  { id: 'e8', source: 'loan-repo', target: 'database-node', label: 'persists', type: 'queries' }
];

export const CODE_SNIPPETS: Record<string, { code: string; language: string }> = {
  'SecurityConfig.java': {
    language: 'java',
    code: `package com.example.loan.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtFilter;
    private final OAuth2SuccessHandler oauthSuccessHandler;

    public SecurityConfig(JwtAuthenticationFilter jwtFilter, 
                          OAuth2SuccessHandler oauthSuccessHandler) {
        this.jwtFilter = jwtFilter;
        this.oauthSuccessHandler = oauthSuccessHandler;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**", "/api/loans/calculate-emi", "/actuator/health").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .oauth2Login(oauth -> oauth
                .successHandler(oauthSuccessHandler)
            )
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}`
  },
  'AppConfig.java': {
    language: 'java',
    code: `package com.example.loan.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.client.RestTemplate;

@Configuration
public class AppConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}`
  },
  'AuthController.java': {
    language: 'java',
    code: `package com.example.loan.controllers;

import com.example.loan.services.AuthService;
import com.example.loan.dto.LoginRequest;
import com.example.loan.dto.AuthResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request) {
        AuthResponse response = authService.authenticate(request.getEmail(), request.getPassword());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.ok(response);
    }
}`
  },
  'LoanApplicationController.java': {
    language: 'java',
    code: `package com.example.loan.controllers;

import com.example.loan.services.LoanEvaluationService;
import com.example.loan.dto.LoanApplicationRequest;
import com.example.loan.dto.LoanDecisionResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/loans")
public class LoanApplicationController {

    private final LoanEvaluationService loanEvaluationService;

    public LoanApplicationController(LoanEvaluationService loanEvaluationService) {
        this.loanEvaluationService = loanEvaluationService;
    }

    @PostMapping("/apply")
    public ResponseEntity<LoanDecisionResponse> applyLoan(
            @RequestBody LoanApplicationRequest request,
            @AuthenticationPrincipal UserDetailsPrincipal principal) {
        LoanDecisionResponse decision = loanEvaluationService.evaluateEligibility(request, principal.getUserId());
        return ResponseEntity.ok(decision);
    }

    @GetMapping("/calculate-emi")
    public ResponseEntity<Double> calculateEMI(
            @RequestParam double principal,
            @RequestParam double annualInterestRate,
            @RequestParam int tenureMonths) {
        double monthlyRate = annualInterestRate / (12 * 100);
        double emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) 
                   / (Math.pow(1 + monthlyRate, tenureMonths) - 1);
        return ResponseEntity.ok(Math.round(emi * 100.0) / 100.0);
    }
}`
  },
  'LoanEvaluationService.java': {
    language: 'java',
    code: `package com.example.loan.services;

import com.example.loan.repositories.LoanRepository;
import com.example.loan.models.LoanApplication;
import com.example.loan.models.LoanStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LoanEvaluationService {

    private final LoanRepository loanRepository;
    private final CreditScoreService creditScoreService;

    public LoanEvaluationService(LoanRepository loanRepository, CreditScoreService creditScoreService) {
        this.loanRepository = loanRepository;
        this.creditScoreService = creditScoreService;
    }

    @Transactional
    public LoanDecisionResponse evaluateEligibility(LoanApplicationRequest request, Long userId) {
        int creditScore = creditScoreService.fetchCreditScore(request.getTaxIdentifier());
        
        // Underwriting Rules Engine
        boolean isEligible = creditScore >= 680 && (request.getMonthlyIncome() * 0.5) > request.getRequestedEmi();
        
        LoanApplication loan = new LoanApplication();
        loan.setApplicantId(userId);
        loan.setPrincipalAmount(request.getPrincipalAmount());
        loan.setCreditScore(creditScore);
        loan.setStatus(isEligible ? LoanStatus.APPROVED : LoanStatus.REJECTED);
        
        loanRepository.save(loan);
        return new LoanDecisionResponse(loan.getId(), loan.getStatus(), isEligible ? "Approved automatically" : "Credit criteria not met");
    }
}`
  },
  'CreditScoreService.java': {
    language: 'java',
    code: `package com.example.loan.services;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import java.util.concurrent.TimeUnit;

@Service
public class CreditScoreService {

    private final StringRedisTemplate redisTemplate;

    public CreditScoreService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public int fetchCreditScore(String taxId) {
        String cacheKey = "credit_score:" + taxId;
        String cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            return Integer.parseInt(cached);
        }
        
        // Mock external bureau score calculation
        int score = 720;
        redisTemplate.opsForValue().set(cacheKey, String.valueOf(score), 24, TimeUnit.HOURS);
        return score;
    }
}`
  },
  'AuthService.java': {
    language: 'java',
    code: `package com.example.loan.services;

import com.example.loan.repositories.UserRepository;
import com.example.loan.models.User;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;

    public AuthService(UserRepository userRepository, 
                       PasswordEncoder passwordEncoder, 
                       JwtTokenProvider tokenProvider) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
    }

    public AuthResponse authenticate(String email, String rawPassword) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("Invalid credentials"));
            
        if (!passwordEncoder.matches(rawPassword, user.getPasswordHash())) {
            throw new RuntimeException("Invalid credentials");
        }
        
        String token = tokenProvider.createToken(user.getEmail(), user.getRoles());
        return new AuthResponse(token, user.getId(), user.getEmail());
    }
}`
  },
  'application.yml': {
    language: 'yaml',
    code: `server:
  port: 8080

spring:
  application:
    name: loan-management
  datasource:
    url: jdbc:mysql://localhost:3306/loan_db?useSSL=false&allowPublicKeyRetrieval=true
    username: root
    password: \${DB_PASSWORD:secret}
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: true
  data:
    redis:
      host: localhost
      port: 6379

jwt:
  secret: 9a6e1c24b5df8e3a2b1c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5
  expiration: 86400000 # 24 Hours
`
  },
  'pom.xml': {
    language: 'xml',
    code: `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" 
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.2.3</version>
        <relativePath/>
    </parent>
    <groupId>com.example</groupId>
    <artifactId>loan-management</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <name>loan-management</name>
    <description>Loan Management & Credit Evaluation Backend</description>
    
    <properties>
        <java.version>21</java.version>
    </properties>
    
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-security</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-redis</artifactId>
        </dependency>
        <dependency>
            <groupId>com.mysql</groupId>
            <artifactId>mysql-connector-j</artifactId>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-api</artifactId>
            <version>0.11.5</version>
        </dependency>
    </dependencies>
</project>`
  }
};

export const SAMPLE_REPOSITORIES: Repository[] = [
  {
    id: 'repo-loan-management',
    name: 'loan-management',
    fullName: 'codegraph-org/loan-management',
    url: 'https://github.com/codegraph-org/loan-management',
    size: '18.4 MB',
    primaryLanguage: 'Java',
    framework: 'Spring Boot 3.2',
    fileCount: 64,
    folderCount: 18,
    estimatedTokens: 380000,
    branch: 'main',
    commitCount: 196,
    status: 'indexed',
    lastIndexedAt: '2 mins ago',
    stats: {
      classes: 42,
      packages: 18,
      files: 64,
      endpoints: 18,
      dependencies: 23,
      functions: 187
    },
    technologies: [
      { name: 'Java', category: 'language', icon: 'local_cafe', color: 'text-primary' },
      { name: 'Spring Boot', category: 'framework', icon: 'energy_program_saving', color: 'text-secondary' },
      { name: 'MySQL', category: 'database', icon: 'database', color: 'text-tertiary' },
      { name: 'Redis', category: 'caching', icon: 'speed', color: 'text-error' },
      { name: 'JWT', category: 'auth', icon: 'key', color: 'text-primary-container' }
    ],
    summary: {
      projectType: 'Spring Boot Backend',
      architecture: 'Layered MVC with Clean Domain Separation (Controller -> Service -> Repository -> DB)',
      backend: 'Spring Boot 3.2 (Java 21)',
      frontend: 'N/A (REST API Service)',
      authentication: 'JWT Bearer Filter + Spring Security 6',
      database: 'MySQL 8.0 with Hibernate ORM',
      caching: 'Redis 7.0 for session and credit ratings',
      buildTool: 'Apache Maven 3.9',
      description: 'This is a Spring Boot backend for loan management. It provides user authentication, loan applications, eligibility evaluation, credit scoring and EMI calculation.',
      keyPackages: [
        'com.example.loan.controllers',
        'com.example.loan.services',
        'com.example.loan.config',
        'com.example.loan.repositories'
      ]
    },
    sampleQuestions: [
      'How can I add Google OAuth to this project?',
      'Explain how loan eligibility evaluation works',
      'What REST endpoints are exposed in LoanApplicationController?',
      'How is Redis caching used in CreditScoreService?',
      'Show me the security filter chain in SecurityConfig.java'
    ],
    graphNodes: LOAN_MANAGEMENT_NODES,
    graphEdges: LOAN_MANAGEMENT_EDGES,
    fileTree: LOAN_MANAGEMENT_FILE_TREE
  },
  {
    id: 'repo-spring-boot',
    name: 'spring-boot-realworld-example-app',
    fullName: 'gothinkster/spring-boot-realworld-example-app',
    url: 'https://github.com/gothinkster/spring-boot-realworld-example-app',
    size: '14.2 MB',
    primaryLanguage: 'Java',
    framework: 'Spring Boot 3.2',
    fileCount: 148,
    folderCount: 32,
    estimatedTokens: 412000,
    branch: 'main',
    commitCount: 284,
    status: 'indexed',
    lastIndexedAt: '1 hour ago',
    stats: {
      classes: 56,
      packages: 22,
      files: 148,
      endpoints: 24,
      dependencies: 19,
      functions: 240
    },
    technologies: [
      { name: 'Java 21', category: 'language', icon: 'local_cafe', color: 'text-primary' },
      { name: 'Spring Boot 3.2', category: 'framework', icon: 'energy_program_saving', color: 'text-secondary' },
      { name: 'MySQL 8.0', category: 'database', icon: 'database', color: 'text-tertiary' },
      { name: 'Redis', category: 'caching', icon: 'speed', color: 'text-error' },
      { name: 'JWT Auth', category: 'auth', icon: 'key', color: 'text-primary' },
      { name: 'Maven', category: 'build', icon: 'build', color: 'text-secondary' }
    ],
    summary: {
      projectType: 'Spring Boot REST API',
      architecture: 'Layered Hexagonal Architecture (Controllers -> Services -> Repositories)',
      backend: 'Spring Boot 3.2 (Java 21)',
      frontend: 'React 18 SPA (Separate Repo)',
      authentication: 'JSON Web Token (JWT) with Custom Filter',
      database: 'MySQL 8.0 with Flyway Migrations',
      caching: 'Redis (Spring Cache Integration)',
      buildTool: 'Apache Maven 3.9',
      description: 'Production-ready Spring Boot backend implementation of the RealWorld codebase guidelines containing JWT authentication, user registration, article creation, tagging system, commenting, and follower graph logic.',
      keyPackages: [
        'com.realworld.api.controllers',
        'com.realworld.core.services',
        'com.realworld.security.jwt',
        'com.realworld.infrastructure.repositories'
      ]
    },
    sampleQuestions: [
      'Explain authentication flow and JWT validation',
      'How does JWT work in SecurityConfig.java?',
      'Summarize REST Controllers & API Endpoints'
    ],
    graphNodes: LOAN_MANAGEMENT_NODES,
    graphEdges: LOAN_MANAGEMENT_EDGES,
    fileTree: LOAN_MANAGEMENT_FILE_TREE
  }
];

export const MOCK_CODE_SNIPPETS = CODE_SNIPPETS;
