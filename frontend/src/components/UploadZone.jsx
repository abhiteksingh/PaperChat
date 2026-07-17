function UploadZone({ uploading, getInputProps, getRootProps }) {
  return (
    <div
      {...getRootProps()}
      className="border border-dashed border-[#2A2A2A] hover:border-[#4C8DFF]/40 bg-[#161616] rounded-[20px] p-16 text-center cursor-pointer transition shadow-2xl animate-fade-in select-none"
    >
      <input {...getInputProps()} />

      <div className="space-y-4">
        <div className="text-4xl animate-bounce">📄</div>

        {uploading ? (
          <div className="space-y-1.5">
            <h3 className="font-display text-lg font-medium text-white">
              Processing PDF...
            </h3>
            <p className="text-xs text-[#9A9A9A] font-body leading-relaxed">
              Summarizing and indexing document
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            <h3 className="font-display text-lg font-medium text-white">
              Drop PDF here
            </h3>
            <p className="text-xs text-[#9A9A9A] font-body leading-relaxed">
              Click or drag your document to start asking
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default UploadZone;