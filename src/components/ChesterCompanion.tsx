'use client';
import { useId } from 'react';
import styles from './ChesterCompanion.module.css';
export default function ChesterCompanion({ paused = false, portrait = false }: { paused?: boolean; portrait?:boolean }) {
 const id = useId().replace(/:/g, '');
 return <svg className={`${styles.mascot} ${paused ? styles.paused : ''}`} viewBox={portrait?'190 40 330 510':'100 30 530 770'} role="img" aria-label="Donkey Chester, in a plum jacket, retro shades and a rockabilly quiff"><defs><radialGradient id={`${id}bg`}><stop stopColor="#68458f"/><stop offset="1" stopColor="#20172f"/></radialGradient><linearGradient id={`${id}coat`} x2="1" y2="1"><stop stopColor="#b095d1"/><stop offset=".5" stopColor="#6f4a90"/><stop offset="1" stopColor="#352646"/></linearGradient><linearGradient id={`${id}fur`} x2=".9" y2="1"><stop stopColor="#bbb0a9"/><stop offset="1" stopColor="#7d7179"/></linearGradient><linearGradient id={`${id}lens`} x2="1" y2="1"><stop stopColor="#6c584b"/><stop offset=".45" stopColor="#292c34"/><stop offset="1" stopColor="#10151e"/></linearGradient><linearGradient id={`${id}hair`} x2=".7" y2="1"><stop stopColor="#4a384e"/><stop offset="1" stopColor="#12111e"/></linearGradient></defs><g className={styles.body}>
<path d="M115 800L138 633Q148 584 232 559L281 544H408L469 565Q538 592 551 641L575 800Z" fill={`url(#${id}coat)`} stroke="#302239" strokeWidth="4"/><path d="M279 551L342 604L409 550L427 800H261Z" fill="#f3e7d8"/><path d="M279 551L343 602L312 638L259 577ZM409 550L343 602L377 636L427 580Z" fill="#fff6e8"/><path d="M320 618L343 602L365 619L356 647H330Z" fill="#b19856"/><path d="M331 646L356 646L367 800H313Z" fill="#8a713c"/>
<path d="M241 563L189 607L242 637L216 677L290 800H318L279 595Z" fill="#bb9bd8"/><path d="M447 563L504 610L448 637L475 677L396 800H369L409 595Z" fill="#523461"/>
<path d="M432 691L480 685L485 696L432 704Z" fill="#e4cf9c"/><path d="M437 690L450 668L466 685L480 666L480 691Z" fill="#eedcb8"/><path d="M173 666L160 800M517 666L536 800" stroke="#5d416d" strokeWidth="4"/>
<circle cx="221" cy="591" r="10" fill="#dec68b"/><path d="M216 588L222 584L226 590L221 596Z" fill="#6d4b84"/>

<path d="M548 704Q622 698 610 649" fill="none" stroke="#96818b" strokeWidth="12" strokeLinecap="round"/><path d="M600 638Q607 618 623 637L614 661L603 657Z" fill="#302438"/>
<g className={styles.head}><g className={styles.earLeft}><path d="M249 278C216 235 182 130 211 67C219 50 231 61 248 98C275 157 285 205 281 261Z" fill={`url(#${id}fur)`} stroke="#554650" strokeWidth="4"/><path d="M248 251C226 200 213 135 220 104C240 150 257 209 260 252Z" fill="#c68b9b"/></g><g className={styles.earRight}><path d="M408 264C407 192 436 102 474 76C495 65 493 89 485 119C474 182 457 234 436 282Z" fill={`url(#${id}fur)`} stroke="#554650" strokeWidth="4"/><path d="M426 255C434 196 455 136 472 110C465 162 450 219 436 257Z" fill="#b97d91"/></g>
<path d="M278 471L280 554Q341 604 407 552L410 465Z" fill="#7c6b73"/><path d="M283 509Q344 550 407 506V533Q350 576 280 542Z" fill="#675563"/>
<path d="M237 277Q236 220 300 202Q359 184 408 211Q459 235 456 296L443 420Q441 495 367 530Q298 547 252 490Q231 461 228 414Z" fill={`url(#${id}fur)`} stroke="#5c4d59" strokeWidth="4"/>
<path d="M397 224Q452 250 449 305L435 424Q437 475 395 502L375 467L391 329Z" fill="#776a76" opacity=".35"/>
<g className={styles.quiff}>
<path d="M239 288Q211 266 226 238Q217 200 253 187Q251 149 288 145Q313 112 350 137Q388 128 411 157Q455 161 459 197Q482 234 452 277L429 287L422 248Q389 261 364 238Q335 222 310 231Q282 252 257 246L257 282Z" fill={`url(#${id}hair)`} stroke="#201624" strokeWidth="4"/>
<path d="M254 200Q278 163 321 170Q374 180 395 164Q390 195 359 204Q340 209 323 201Q348 191 335 180Q317 167 295 189Q279 204 254 200Z" fill="#72546f"/>
<path d="M264 216Q302 185 333 207Q375 233 413 205M270 163Q298 139 329 155M364 153Q405 144 428 180" fill="none" stroke="#80607d" strokeWidth="6" strokeLinecap="round"/>
<path d="M415 231Q443 252 426 275Q416 287 410 273Q424 270 421 260Q416 247 402 248Z" fill="#38263d"/>
</g>
<path d="M230 307L260 301M437 303L458 296" fill="none" stroke="#302128" strokeWidth="11" strokeLinecap="round"/>
<path d="M244 295Q280 281 317 295L326 308Q325 350 303 362Q274 375 249 352Q236 333 238 310Z" fill={`url(#${id}lens)`} stroke="#624031" strokeWidth="11"/>
<path d="M352 296Q389 281 429 293L437 308Q439 340 420 355Q395 374 368 359Q350 346 348 310Z" fill={`url(#${id}lens)`} stroke="#624031" strokeWidth="11"/>
<path d="M323 307Q337 298 350 307" fill="none" stroke="#624031" strokeWidth="11"/>
<path d="M252 302L280 295M359 302L386 293" stroke="#aa7852" strokeWidth="4" strokeLinecap="round"/>
<path d="M250 314L276 300L288 301L252 325ZM363 311L391 296L404 298L364 325Z" fill="#d8d3c4" opacity=".22"/>

<path d="M263 370Q303 352 341 371Q387 349 418 372Q458 402 444 453Q432 506 363 522Q298 534 251 496Q219 467 230 420Q236 387 263 370Z" fill="#d8c4b7" stroke="#8f7a80" strokeWidth="3"/>
<path d="M232 433Q246 485 304 500Q371 517 432 477Q410 512 361 523Q299 533 252 497Q228 475 232 433Z" fill="#c2aaa1"/>
<ellipse cx="275" cy="403" rx="17" ry="11" transform="rotate(-18 275 403)" fill="#66505a"/><ellipse cx="396" cy="399" rx="17" ry="11" transform="rotate(18 396 399)" fill="#66505a"/>
<path d="M265 447Q333 475 409 434Q388 487 337 490Q292 489 265 447Z" fill="#4a303c"/><path d="M277 453Q337 474 398 445L388 458Q336 484 291 464Z" fill="#fff2db"/><path d="M307 487Q335 472 361 486" fill="none" stroke="#a26c79" strokeWidth="5" strokeLinecap="round"/>
<path d="M249 435L242 445M420 425L427 436M298 379L294 385" fill="none" stroke="#ac9290" strokeWidth="3" strokeLinecap="round"/>
</g></g></svg>;
}
