
function PdfStatus(){
    return (
          <div className="mb-6">
            <div
              className="
                inline-flex
                items-center
                gap-2
                px-4
                py-2
                rounded-full
                border
                border-white/20
                bg-white/5
              "
            >
              <span className="h-2 w-2 rounded-full bg-green-400"></span>
              PDF Ready
            </div>
          </div>
    )
}

export default PdfStatus