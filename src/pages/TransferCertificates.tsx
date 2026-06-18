import { BookOpen } from 'lucide-react';

export default function TransferCertificates() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Transfer Certificates</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Generate Transfer Certificates for students</p>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
        <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <BookOpen className="w-8 h-8 text-amber-600 dark:text-amber-400" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Transfer Certificate Generator</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm max-w-md mx-auto">
          This module will allow you to automatically generate Transfer Certificates using stored student data.
          Coming in the next release.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-xs font-medium">
          Coming Soon
        </div>
      </div>
    </div>
  );
}
