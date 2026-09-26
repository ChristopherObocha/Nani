import { useEffect, useState } from 'react'
import { loadImage } from '../data/repository'
export function ImageView({id}:{id?:string}){const [url,setUrl]=useState('');useEffect(()=>{if(!id)return;let local='';void loadImage(id).then(b=>{if(b){local=URL.createObjectURL(b);setUrl(local)}});return()=>{if(local)URL.revokeObjectURL(local)}},[id]);return url?<img className="question-image" src={url} alt="Question visual"/>:null}
