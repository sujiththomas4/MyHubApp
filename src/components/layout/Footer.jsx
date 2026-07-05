export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="app-footer">
      <div className="container-fluid d-flex justify-content-between flex-wrap gap-2">
        <span>© {year} Hub.</span>
        <span>
          Crafted with <i className="ri-heart-fill text-danger" /> for my workspace
        </span>
      </div>
    </footer>
  )
}
