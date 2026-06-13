
function UploadZone({uploading , getInputProps , getRootProps}){
    return (
        <div
          {...getRootProps()}
          className="
            border
            border-white/20
            bg-white/5
            backdrop-blur-xl
            rounded-3xl
            p-16
            text-center
            cursor-pointer
            transition
            hover:border-white/40
            hover:bg-white/10
            shadow-2xl
          "
        >
          <input {...getInputProps()} />

          <div className="space-y-3">
            <div className="text-5xl">📄</div>

            {uploading ? (
              <>
                <p className="text-lg font-medium">
                  Processing PDF...
                </p>
                <p className="text-zinc-400">
                  Summarizing and indexing document
                </p>
              </>
            ) : (
              <>
                <p className="text-xl font-medium">
                  Drop PDF here
                </p>
                <p className="text-zinc-400">
                  Click or drag your document
                </p>
              </>
            )}
          </div>
        </div>
    )
}

export default UploadZone;