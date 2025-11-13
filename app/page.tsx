export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="flex flex-col items-center justify-center gap-8 text-center">
        <h1 className="text-6xl font-bold text-gray-900 dark:text-white">
          Hello World 👋
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-md">
          Welcome to Ask Next.js with ShadCN UI
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Ready to build something amazing!
        </p>
      </main>
    </div>
  );
}
