param([Parameter(ValueFromRemainingArguments)] [string[]]$PrismaArgs)

docker run --rm -it `
  --network hackathonproejct_default `
  -v "${PWD}\..\..:/app" `
  -w /app/services/api `
  -e DATABASE_URL="postgresql://mip_user:mip_password@mip-postgres:5432/mip_dev?connect_timeout=30" `
  -e SHADOW_DATABASE_URL="postgresql://mip_user:mip_password@mip-postgres:5432/mip_shadow?connect_timeout=30" `
  -e DEBUG="prisma:*" `
  node:20 `
  sh -c "npm install -g prisma > /dev/null 2>&1 && npx prisma $PrismaArgs"