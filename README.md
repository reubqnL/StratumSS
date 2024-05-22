<div align="center">

<img src="/images/icon.png" alt="StratumSS Logo" width="120">

# StratumSS

A human-readable CSS framework built around clear, explicit utility classes.

</div>


---

## About

**StratumSS** is a lightweight CSS framework inspired by utility-first frameworks such as Tailwind CSS.

The goal is simple: make CSS utilities **easy to read, understand, and remember**.

Instead of shortened utility names, StratumSS uses class names that closely match standard CSS properties.

```html
<div class="flex fwrap-wrap content-horizontal-start"> 
    Content
</div>
```

Rather than needing to remember what abbreviated utilities mean, the class names directly describe what they do.

## Current Status

StratumSS is currently in early development.

The project is starting with a collection of straightforward CSS utilities, with the long-term goal of developing a complete framework with:

* Utility-first CSS
* Human-readable class names
* Responsive utilities
* Spacing and sizing utilities
* Typography utilities
* A build system
* Automatic CSS generation
* A command-line interface
* npm distribution

Features will be added gradually as the framework develops.

## Example

```html
<div class="flex fwrap-wrap content-horizontal-start">
    <h1>StratumSS</h1>
    <button>Get Started</button>
</div>
```

The class names are intentionally explicit:

| Class                     | CSS                              |
| ------------------------- | -------------------------------- |
| `flex`                    | `display: flex`                  |
| `fwrap`                   | `flex-wrap: wrap`                |
| `content-vertical-center` | `align-content: center`          |
| `trans-none`              | `translate: none`                |

## Why StratumSS?

CSS frameworks can become difficult to understand when utility names are heavily abbreviated.

StratumSS aims to keep utilities close to the CSS they represent.

**Readable. Explicit. Predictable.**

## Project Structure

The project currently follows a simple structure:

```text
StratumSS/
├── css/
│   └── framework.css
├── examples/
│   └── index.html
├── images/
│   └── icon.png
├── README.md
├── LICENSE
└── .gitignore
```

As the project grows, the structure will evolve to support the framework's compiler, CLI, testing system, and package distribution.

## Development

Clone the repository:

```bash
git clone https://github.com/reubqnL/StratumSS.git
```

Enter the project:

```bash
cd StratumSS
```

The framework can currently be experimented with by including its CSS file in an HTML document:

```html

<link rel="stylesheet" href="src/css/framework.css">
```

## Roadmap

* [x] Initial project structure
* [x] Flexbox utilities
* [x] Alignment utilities
* [x] Justification utilities
* [ ] Spacing utilities
* [ ] Sizing utilities
* [ ] Typography utilities
* [ ] Responsive utilities
* [ ] npm package
* [ ] CSS generation system
* [ ] Project scanner
* [ ] CLI
* [ ] Documentation website
* [ ] Production-ready release

## Contributing

StratumSS is intended to be an open-source project.

Contributions, suggestions, bug reports, and ideas are welcome as the project develops.

## License

StratumSS is released under the MIT License.

See [`LICENSE`](LICENSE) for the full license text.

---

<p align="center">
  Built with CSS and a lot of experimentation.
</p>
