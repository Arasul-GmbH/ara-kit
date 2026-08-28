---
role: partner             # partner | company
language: en              # de | en, which language Ara speaks and the tools print in
name:
salutation:               # how you want to be addressed
company:
region:
skills:                   # what you can do, comma separated: development, administration, domain, sales
tools:                    # what your house works with, comma separated, e.g. DATEV, HubSpot, Nextcloud
invoice:                  # partner only: yes | no | later, should the kit produce invoices
invoice_tool:             # partner only: what invoices are written with today
detail_level: medium      # low | medium | high, how much Ara explains
security_level: standard  # standard | relaxed
experience:               # briefly: linux, ssh, hardware on site
flash_host: unknown       # no | yes | unknown, x86 Linux available for flashing
ssh_key:                  # name of the key in ~/.ssh
secrets_store: env        # env | keychain
browser: yes              # yes | no, may Ara operate the browser herself
backup_repo:              # where this kit is backed up, if set up
first_device:             # model of the first device, empty if none is coming
first_device_state:       # present | ordered | none
first_app:                # one sentence: what the first app should do
created:
---

<!-- This file belongs to you. Ara writes it in your language and addresses you in
     it, she does not write about you. -->

## Who I am and what I can do

<!-- Role, strengths, what you do yourself and what you do not. How much every
     command explains follows from that. Addressed to you. -->

## How I want to work

<!-- How much should be explained, what you can do yourself, what matters to you.
     Addressed to you. -->

## What my house works with

<!-- Accounting, CRM, ticketing, file storage, communication, ERP or industry
     software. For a company: what apps will dock onto later. For a partner: the
     stack you know at customers. -->

## What I intend

<!-- Where you want to go: how many customers, which industries, whether this runs
     on the side or is your main business. As a company: what the device is there
     for, which departments use it, what the first app should do. -->

## Deviations from the standard rules

<!-- Only if rules were relaxed: what exactly, since when, why. -->

## Technical state of this computer

<!-- Result of check-environment.mjs, with a date. What is missing stands here as
     an open point. -->
