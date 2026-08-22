import tommyHead from '../brand/assets/tommy-head-orange.png'

export function BrandMark() {
  return (
    <>
      <span className="brand-badge">
        <img src={tommyHead} alt="" className="brand-badge__img" />
      </span>
      <span className="brand-wordmark">
        <span className="brand-wordmark__symbol">~/</span>
        <span className="brand-wordmark__name">anniethmetic</span>
      </span>
    </>
  )
}
