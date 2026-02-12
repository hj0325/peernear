#!/bin/bash

# 인증서 디렉토리 생성
mkdir -p cert

# openssl 설정 파일 생성
cat > cert/openssl.conf <<EOF
[req]
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
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
IP.1 = 127.0.0.1
IP.2 = ::1
EOF

# 자체 서명 인증서 생성
openssl req -x509 -newkey rsa:2048 -keyout cert/localhost-key.pem -out cert/localhost.pem -days 365 -nodes -config cert/openssl.conf

# 설정 파일 삭제
rm cert/openssl.conf

echo "✅ SSL 인증서가 생성되었습니다!"
echo "   cert/localhost-key.pem"
echo "   cert/localhost.pem"
