const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// 인증서 파일 경로
const certPath = path.join(__dirname, 'cert');
const keyPath = path.join(certPath, 'localhost-key.pem');
const certFilePath = path.join(certPath, 'localhost.pem');

app.prepare().then(() => {
  // 인증서 파일이 있는지 확인하고 없으면 생성
  if (!fs.existsSync(keyPath) || !fs.existsSync(certFilePath)) {
    console.log('\n📝 SSL 인증서를 생성하는 중...\n');
    
    // 인증서 디렉토리 생성
    if (!fs.existsSync(certPath)) {
      fs.mkdirSync(certPath, { recursive: true });
    }

    // openssl 설정 파일 생성 (더 간단하고 호환성 높은 방식)
    const opensslConfig = `[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no

[req_distinguished_name]
C = KR
ST = Seoul
L = Seoul
O = Local Development
CN = localhost

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
IP.1 = 127.0.0.1
IP.2 = ::1
`;

    const configPath = path.join(certPath, 'openssl.conf');
    fs.writeFileSync(configPath, opensslConfig);

    // openssl로 인증서 생성
    const { execSync } = require('child_process');
    try {
      // 먼저 개인키 생성
      execSync(
        `openssl genrsa -out "${keyPath}" 2048`,
        { stdio: 'inherit' }
      );
      // 인증서 생성
      execSync(
        `openssl req -new -x509 -key "${keyPath}" -out "${certFilePath}" -days 365 -config "${configPath}"`,
        { stdio: 'inherit' }
      );
      // 설정 파일 삭제
      fs.unlinkSync(configPath);
      console.log('\n✅ SSL 인증서가 생성되었습니다!\n');
    } catch (error) {
      console.error('\n❌ 인증서 생성에 실패했습니다.');
      console.log('   HTTP로 실행하려면: yarn dev:http\n');
      process.exit(1);
    }
  }

  const httpsOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certFilePath),
  };

  createServer(httpsOptions, async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  }).listen(port, hostname, (err) => {
    if (err) throw err;
    console.log(`\n✅ HTTPS 서버가 실행되었습니다:`);
    console.log(`   https://localhost:${port}`);
    console.log(`   https://[로컬IP]:${port} (모바일 접속용)\n`);
  });
});
