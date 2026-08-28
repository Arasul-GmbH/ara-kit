# Ara-Kit

*[Deutsche Fassung](README.de.md) · [Legal notice](#legal-notice-impressum)*

Ara-Kit is a toolbox for Claude Code that helps you set up, hand over and look after self-hosted machines, at your customers or in your own house. A machine here is anything you can reach over `ssh`: a server in the rack, a mini PC under the desk, a board on a shelf, a virtual machine at a hoster. You clone the kit, open the folder in a terminal and start `claude`: `git clone https://github.com/Arasul-GmbH/ara-kit.git`, `cd ara-kit`, `claude`. You need Claude Code, Node.js 20 or newer and `ssh`. Whether your computer has that, the kit checks itself.

The first command is `/init`. Ara asks which language you want to work in (English or German, both are complete), whether you are a partner (you set up machines for customers) or a company (you run your own machine), who you are and how you work. After that your commands are in place and your profile sits in `business/`. If you would rather not click, fill in an answer file after `.ara/templates/init-answers-partner.json` or `init-answers-company.json` and hand it over: `/init <file>`. Every further `/init` first tells you which version you are sitting on, what is new about it and up to which contract version this kit works together with a machine, then it fetches the current version, shows what changes, and offers you new commands. Your folders `business/`, `customers/`, `devices/` and `apps/` belong to you, are excluded from version control and are never touched by an update.

## What it does without any product on the machine

You keep your customers and their files, track follow-ups and expiring maintenance, create a device file with `/device` and learn what the hardware is and what it can carry, reach machines over SSH with the credentials from the file, write offers with all annexes as PDF in your own name, and log every setup in a runsheet. `/maintain` starts with a status line that it measures on the machine instead of copying it from the file: uptime, disk, memory, containers, failed services, errors in the log of the last day, and on request it puts the maintenance report into the file. If one route does not work, because SSH is down for example, the report comes from the other one and tells you what is missing. After that comes diagnosis, update or extension. Anything that changes a customer machine you confirm beforehand.

With `/app` you build your own app and bring it onto a machine. Ara first asks what it is about, who uses it, what data goes in, where a language model does the work and at which point a human should decide; out of that comes a plan that you read before anything is built. The scaffold brings a frontend, a backend and a first flow. Building happens on your computer, deployment goes into the staging slot of the machine, you switch it live yourself. On a plain machine the same app runs over Compose, and the kit tells you what is missing there: login, flows, permissions. What that looks like you can see in the reference app under `apps/urlaubsantrag/`: a request stops, a human decides, after that it stands as approved.

Invoices the kit only writes if you want it to: `/init` asks, and only then does `/invoice` exist. The command takes the line items from the offer in the customer file, assigns the next number from your number range in `business/`, checks the mandatory fields under section 14 of the German VAT act one by one and only prints when none is missing. The PDF carries the invoice data inside itself as `factur-x.xml`, which is ZUGFeRD after EN 16931: the human sees the sheet, the customer's accounting reads the file, nobody retypes anything. What stays unchecked the tool says itself, instead of claiming completeness. An accounting system the kit does not become: incoming payments, dunning and VAT returns keep running where they run today.

The kit is open under Apache 2.0 and also runs in your own fork: `/init` fetches the version as an archive, it needs no upstream remote.

## Where Arasul comes in

Arasul is a self-hosting platform for AI in a company, and it is the one product this kit knows in detail. You do not need it. Where it would do something better than a bare machine, the kit says so once and then keeps going without it.

With Arasul the machine itself becomes a source. `/device` installs the platform: it fetches the installer with your token from the portal, pushes it onto the machine, runs it there with a start password and a network name, and creates the key with which the kit later rolls apps onto it. What the installer is called the artifact says itself, the kit does not guess it; the start password lands in your secret store and nowhere else. What the platform can do beyond that, for instance creating the first employee and sharing something with them, is in the manuals that come with the artifact: `node .ara/tools/mirror.mjs --docs` tells you which those are. After that Ara asks the machine what it promises instead of claiming something: manifest, limits and endpoints come out of its contract, and if the kit does not fit, she says so before anything is deployed. A token you only need for that installation: every partner gets five of them free in the portal, they open the download and nothing else.

## Paperwork comes off the machine

For the paperwork the same rule holds as for everything else: it comes into being on the machine. `node .ara/tools/service-description.mjs --device <device>` creates the service description and enters what the machine answers, software version, contract version, models and apps, every value with its source in the document. What it could not measure stays a placeholder and gets named, and the maturity level per functional area stays your decision.

The contract templates under `.ara/vorlagen/` and the evidence under `.ara/nachweise/` are German and stay German: they are legally binding text for the DACH market, mirrored from Arasul's own control folder. The procedures around them exist in both languages.

## When something is odd

`node .ara/tools/selftest.mjs` checks in half a minute, without network and without a machine, whether the kit works on your computer. Every tool answers `--help` with its header help and does nothing else while doing so. `node .ara/tools/check-docs.mjs --device <device>` checks the other direction: it takes every route that stands in the kit's knowledge, holds it against your machine's contract and asks there. What no longer exists shows up before you work along it.

Secrets sit in a `.env` inside the kit or in your operating system's keychain, SSH keys stay in `~/.ssh`. Two things remain your responsibility: switch on disk encryption and set up a backup, `/init` offers you a private repository for that.

## Language

English is the kit's main language, German is equivalent and complete. `/init` asks in the first round, the answer goes into `business/profile.md` as `language: de|en`, and from then on Ara speaks that language and the tools print in it. Documents come in pairs: `README.md` and `README.de.md`, `.ara/knowledge/device.md` and `.ara/knowledge/device.de.md`, and so on for the commands and the scaffolds. The self-test counts the pairs, so neither language can quietly fall behind.

The DACH region stays the primary audience. That is why the paperwork is German and why the invoice knows section 14 of the German VAT act.

## Legal notice (Impressum)

Information under section 5 DDG:

Kolja Schöpe, Dresden, Germany.

The full details are at <https://arasul.de/impressum>.

This section is the legal notice for this repository. It is what the GitHub profile points at.

## License

Apache License 2.0, see [LICENSE](LICENSE).
