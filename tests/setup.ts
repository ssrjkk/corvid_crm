// Выполняется ДО импортов каждого тестового файла — роутеры и prisma-синглтон
// должны увидеть тестовую БД, а не dev.db.
process.env.DATABASE_URL = "file:./test.db"
process.env.NODE_ENV = "test"
