import { useMemo, useState } from 'react';
import { ExternalLink, Search } from 'lucide-react';
import { papers, reviews } from './research';

export function ResearchPage() {
  const [query,setQuery]=useState('');
  const [filter,setFilter]=useState<'reviewed'|'downloaded'|'all'>('reviewed');
  const reviewed=new Set(reviews.map(r=>r.paper_id));
  const rows=useMemo(()=>papers.filter(p=>(filter==='all'||filter==='downloaded'&&p.full_text_status==='downloaded'||filter==='reviewed'&&reviewed.has(p.id)) && `${p.title} ${p.authors} ${p.journal} ${p.topics.join(' ')}`.toLowerCase().includes(query.toLowerCase())).slice(0,100),[query,filter]);
  return <><div className="page-heading"><div><div className="eyebrow">THE RESEARCH LIBRARY</div><h1>Read the evidence</h1><p>Paper records and focused reviews behind the app's interpretation. Discovery alone does not make a paper approved evidence.</p></div></div>
    <div className="research-toolbar"><div className="search-field"><Search size={17}/><input aria-label="Search research papers" placeholder="Search title, author, topic…" value={query} onChange={e=>setQuery(e.target.value)}/></div><select aria-label="Research status" value={filter} onChange={e=>setFilter(e.target.value as typeof filter)}><option value="reviewed">Reviewed</option><option value="downloaded">Full text saved</option><option value="all">All candidates</option></select></div>
    <p className="research-count">{rows.length} shown · {papers.length} candidate records · {reviews.length} focused reviews</p>
    <div className="research-list">{rows.map(p=>{const review=reviews.find(r=>r.paper_id===p.id);return <article key={p.id} className="research-paper"><div><span className="tag">{review?'Focused review':p.full_text_status==='downloaded'?'Full text saved':'Candidate'}</span><span className="muted">{p.year} · {p.journal}</span></div><h2>{p.title}</h2><p>{p.authors}</p>{review&&<><p><strong>Finding:</strong> {review.finding}</p><p><strong>Limits:</strong> {review.limitations}</p></>}<div className="research-links">{p.pubmed_url&&<a href={p.pubmed_url} target="_blank" rel="noreferrer">PubMed <ExternalLink size={12}/></a>}{p.publisher_url&&<a href={p.publisher_url} target="_blank" rel="noreferrer">Publisher <ExternalLink size={12}/></a>}{p.pmcid&&<a href={`https://pmc.ncbi.nlm.nih.gov/articles/${p.pmcid}/`} target="_blank" rel="noreferrer">PMC full text <ExternalLink size={12}/></a>}</div></article>;})}</div>
  </>;
}
